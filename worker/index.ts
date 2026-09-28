/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleFanoutMessage } from "./push/fanout-consumer.ts";
import { handleDeliveryMessage } from "./push/delivery-consumer.ts";
import { handlePushEventRequest, type PushBatchQueue } from "./push/handler.ts";
import {
  dispatchPushQueueBatch,
  type DeliveryMessage,
  type FanoutMessage,
  type PushQueueBatch,
} from "./push/queue-messages.ts";
import type { PushRateLimiter } from "./push/rate-limit.ts";

export interface Env {
  ASSETS: Fetcher;
  COUNT: D1Database;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  PUSH_FANOUT_QUEUE: PushBatchQueue<FanoutMessage>;
  PUSH_DELIVERY_QUEUE: PushBatchQueue<DeliveryMessage>;
  PUSH_EVENTS_RATE_LIMITER: PushRateLimiter;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type SitemapCache = Pick<Cache, "match" | "put">;
type NextHandler = () => Promise<Response>;

const SITEMAP_CACHE_CONTROL = "public, max-age=86400";
const SITEMAP_CACHE_HEADER = "X-Gubify-Sitemap-Cache";
const COMMUNITY_CATALOG_CACHE_CONTROL = "public, max-age=600";
const COMMUNITY_CATALOG_CACHE_HEADER = "X-Gubify-Community-Catalog-Cache";

function copyResponse(response: Response, headers: Headers): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleRequestWithSitemapCache(
  request: Request,
  ctx: ExecutionContext,
  next: NextHandler,
  cache: SitemapCache,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/sitemap.xml") {
    return next();
  }

  const cacheKey = new Request(`${url.origin}/sitemap.xml`, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set(SITEMAP_CACHE_HEADER, "HIT");
    return copyResponse(cached, headers);
  }

  const response = await next();
  if (response.status !== 200) {
    const headers = new Headers(response.headers);
    headers.set(SITEMAP_CACHE_HEADER, "MISS");
    return copyResponse(response, headers);
  }

  const cacheHeaders = new Headers(response.headers);
  cacheHeaders.set("Cache-Control", SITEMAP_CACHE_CONTROL);
  cacheHeaders.delete(SITEMAP_CACHE_HEADER);
  const cacheResponse = copyResponse(response.clone(), cacheHeaders);
  ctx.waitUntil(cache.put(cacheKey, cacheResponse));

  const clientHeaders = new Headers(response.headers);
  clientHeaders.set("Cache-Control", SITEMAP_CACHE_CONTROL);
  clientHeaders.set(SITEMAP_CACHE_HEADER, "MISS");
  return copyResponse(response, clientHeaders);
}

export async function handleRequestWithCommunityCatalogCache(
  request: Request,
  ctx: ExecutionContext,
  next: NextHandler,
  cache: SitemapCache,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/api/communities") {
    return next();
  }

  const cacheKey = new Request(`${url.origin}/api/communities`, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set(COMMUNITY_CATALOG_CACHE_HEADER, "HIT");
    return copyResponse(cached, headers);
  }

  const response = await next();
  if (response.status !== 200) {
    const headers = new Headers(response.headers);
    headers.set(COMMUNITY_CATALOG_CACHE_HEADER, "MISS");
    return copyResponse(response, headers);
  }

  const cacheHeaders = new Headers(response.headers);
  cacheHeaders.set("Cache-Control", COMMUNITY_CATALOG_CACHE_CONTROL);
  cacheHeaders.delete(COMMUNITY_CATALOG_CACHE_HEADER);
  ctx.waitUntil(cache.put(cacheKey, copyResponse(response.clone(), cacheHeaders)));

  const clientHeaders = new Headers(response.headers);
  clientHeaders.set("Cache-Control", COMMUNITY_CATALOG_CACHE_CONTROL);
  clientHeaders.set(COMMUNITY_CATALOG_CACHE_HEADER, "MISS");
  return copyResponse(response, clientHeaders);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/push/events") {
      return handlePushEventRequest(request, env, ctx);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    if (request.method === "GET" && url.pathname === "/api/communities") {
      return handleRequestWithCommunityCatalogCache(
        request,
        ctx,
        () => handler.fetch(request, env, ctx),
        (caches as CacheStorage & { default: Cache }).default,
      );
    }

    if (request.method !== "GET" || url.pathname !== "/sitemap.xml") {
      return handler.fetch(request, env, ctx);
    }

    return handleRequestWithSitemapCache(
      request,
      ctx,
      () => handler.fetch(request, env, ctx),
      (caches as CacheStorage & { default: Cache }).default,
    );
  },

  async queue(batch: PushQueueBatch, env: Env): Promise<void> {
    // Cloudflare's subrequest cap applies to the whole Queue invocation, not
    // independently to every message in a delivered batch. Process at most
    // one FANOUT or DELIVERY message and defer the remainder in byte-safe chunks
    // with reserved subrequests, so the 40-call budget holds
    // even if an external Queue configuration later uses batches above one.
    await dispatchPushQueueBatch(
      batch,
      (message, maximumSubrequests) => handleFanoutMessage(message, env, maximumSubrequests),
      (messages) => env.PUSH_FANOUT_QUEUE.sendBatch(messages.map((body) => ({ body }))),
      {
        consume: (message, maximumSubrequests) => handleDeliveryMessage(message, env, maximumSubrequests),
        defer: (messages) => env.PUSH_DELIVERY_QUEUE.sendBatch(messages.map((body) => ({ body }))),
      },
    );
  },
};

export default worker;
