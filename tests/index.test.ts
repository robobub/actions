import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("worker", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it("should return a html page", async () => {
    const resp = await worker.fetch("/");
    const text = await resp.text();
    expect(text).toContain("mention me for a surprise 🐰");
  });
});
