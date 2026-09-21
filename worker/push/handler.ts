import {
  FirebaseTokenVerificationError,
  verifyFirebaseIdToken,
  type FirebaseTokenVerificationOptions,
  type VerifiedFirebaseUser,
} from "./firebase-id-token.ts";
import { PushRequestError, readPushEventRequest } from "./contracts.ts";
import {
  hashRateLimitIdentity,
  isRateLimitAllowed,
  type PushRateLimiter,
} from "./rate-limit.ts";

export interface PushQueue<Message = unknown> {
  send(message: Message): Promise<void>;
}

export interface PushEventEnv {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  PUSH_FANOUT_QUEUE: PushQueue;
  PUSH_DELIVERY_QUEUE: PushQueue;
  PUSH_EVENTS_RATE_LIMITER: PushRateLimiter;
}

export interface PushExecutionContext {
  waitUntil?(promise: Promise<unknown>): void;
}

interface HandlerDependencies {
  verifyFirebaseIdToken?: (
    token: string,
    projectId: string,
    options?: FirebaseTokenVerificationOptions,
  ) => Promise<VerifiedFirebaseUser>;
  firebaseVerification?: FirebaseTokenVerificationOptions;
  crypto?: Crypto;
  onRateLimitKey?: (key: string) => void;
}

type PushEventRequestHandler = (
  request: Request,
  env: PushEventEnv,
  ctx: PushExecutionContext,
) => Promise<Response>;

function jsonResponse(status: number, error: string): Response {
  return Response.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function bearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("Authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  return match?.[1];
}

export function createPushEventRequestHandler(
  dependencies: HandlerDependencies = {},
): PushEventRequestHandler {
  const verifyToken = dependencies.verifyFirebaseIdToken ?? verifyFirebaseIdToken;
  const cryptoImplementation = dependencies.crypto ?? globalThis.crypto;

  return async (request, env, ctx) => {
    void ctx;
    if (request.method !== "POST") {
      const response = jsonResponse(405, "Method not allowed");
      response.headers.set("Allow", "POST");
      return response;
    }
    if (!env?.PUSH_EVENTS_RATE_LIMITER || !cryptoImplementation?.subtle) {
      return jsonResponse(503, "Push events are unavailable");
    }

    try {
      const sourceIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const sourceKey = await hashRateLimitIdentity("ip", sourceIp, cryptoImplementation);
      dependencies.onRateLimitKey?.(sourceKey);
      if (!await isRateLimitAllowed(env.PUSH_EVENTS_RATE_LIMITER, sourceKey)) {
        return jsonResponse(429, "Too many requests");
      }

      const token = bearerToken(request);
      if (!token || !env.FIREBASE_PROJECT_ID) {
        return jsonResponse(401, "Unauthorized");
      }
      const user = await verifyToken(token, env.FIREBASE_PROJECT_ID, dependencies.firebaseVerification);

      const uidKey = await hashRateLimitIdentity("uid", user.uid, cryptoImplementation);
      dependencies.onRateLimitKey?.(uidKey);
      if (!await isRateLimitAllowed(env.PUSH_EVENTS_RATE_LIMITER, uidKey)) {
        return jsonResponse(429, "Too many requests");
      }

      await readPushEventRequest(request);
      return jsonResponse(501, "Push event processing is not implemented");
    } catch (error) {
      if (error instanceof PushRequestError) {
        return jsonResponse(error.status, error.message);
      }
      if (error instanceof FirebaseTokenVerificationError) {
        return jsonResponse(401, "Unauthorized");
      }
      return jsonResponse(503, "Push events are unavailable");
    }
  };
}

export const handlePushEventRequest = createPushEventRequestHandler();
