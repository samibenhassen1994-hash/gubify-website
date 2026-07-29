import { registerHooks } from "node:module";

const cloudflareWorkersSource = `export const env = new Proxy({}, {
  get(_target, key) { return globalThis.__cloudflareTestEnv?.[key]; }
});`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "cloudflare:workers", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "cloudflare:workers") {
      return {
        format: "module",
        source: cloudflareWorkersSource,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
