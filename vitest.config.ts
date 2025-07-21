import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    name: "robobub-actions",
    poolOptions: {
      workers: {
        singleWorker: true,
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
          },
        },
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
      },
    },
  },
});
