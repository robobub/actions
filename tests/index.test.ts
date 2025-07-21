import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { expect, it } from "vitest";
import worker from "../src";

it("respond with a 404", async () => {
  const request = new Request("https://robobub.luxass.dev/not-found");
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env as CloudflareBindings);
  await waitOnExecutionContext(ctx);

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    path: "/not-found",
    message: "Not found",
    status: 404,
    timestamp: expect.any(String),
  });
});
