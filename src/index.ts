import type { Env, HonoContext } from "./types";
import {
  Octokit,
} from "@octokit/core";

import {
  paginateRest,
} from "@octokit/plugin-paginate-rest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import indexPage from "./assets/index.html";
import { CRONS } from "./crons";

const $Octokit = Octokit.plugin(paginateRest);

const app = new Hono<HonoContext>();
app.use("*", logger());
app.use(prettyJSON());

app.get("/", async (ctx) => {
  const url = new URL(ctx.req.url);

  const index = indexPage
    .replaceAll("{{ URL }}", `https://${url.host}`)
    .replaceAll("{{ OG_URL }}", `https://image.luxass.dev/api/image/emoji`);
  return ctx.html(index);
});

app.get("/favicon.ico", async (ctx) => {
  // return a random emoji as favicon
  return ctx.redirect("https://image.luxass.dev/api/image/emoji");
});

app.get("/view-source", (ctx) => {
  return ctx.redirect("https://github.com/robobub/actions");
});

app.onError(async (err, c) => {
  console.error(err);
  const url = new URL(c.req.url);
  if (err instanceof HTTPException) {
    return c.json({
      path: url.pathname,
      status: err.status,
      message: err.message,
      timestamp: new Date().toISOString(),
    }, err.status);
  }

  return c.json({
    path: url.pathname,
    status: 500,
    message: "Internal server error",
    timestamp: new Date().toISOString(),
  }, 500);
});

app.notFound(async (c) => {
  const url = new URL(c.req.url);
  return c.json({
    path: url.pathname,
    status: 404,
    message: "Not found",
    timestamp: new Date().toISOString(),
  }, 404);
});

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const trigger = event.cron;

    if (!CRONS.has(trigger)) {
      console.error(`No cronjob found for trigger ${trigger}`);
      return;
    }

    const cron = CRONS.get(trigger)!;

    // eslint-disable-next-line no-console
    console.info(`Running cronjob ${trigger}`);

    const octokit = new $Octokit({
      auth: env.GITHUB_TOKEN,
    });

    await cron.handler({
      event,
      env,
      ctx,
      octokit,
    });
  },
  async fetch(request: Request, env: Env) {
    return await app.fetch(request, env);
  },
};
