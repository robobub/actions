import {
  Octokit,
} from '@octokit/core'

import {
  paginateRest,
} from '@octokit/plugin-paginate-rest'

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { HTTPException } from 'hono/http-exception'
import type { Env, HonoContext } from './types'
// @ts-expect-error no types for html files
import indexPage from './assets/index.html'
import { CRONS } from './crons'

const $Octokit = Octokit.plugin(paginateRest)

const app = new Hono<HonoContext>()
app.use('*', logger())
app.use(prettyJSON())

app.get('/', async (ctx) => {
  return ctx.html(indexPage)
})

app.get('/favicon.ico', async (ctx) => {
  // return a random emoji as favicon
  return ctx.redirect('https://image.luxass.dev/api/image/random-emoji')
})

app.get('/view-source', (ctx) => {
  return ctx.redirect('https://github.com/robobub/actions')
})

app.onError(async (err, ctx) => {
  console.error(err)
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  const message = ctx.env.ENVIRONMENT === 'production' ? 'Internal server error' : err.stack
  console.error(err)
  return new Response(message, {
    status: 500,
  })
})

app.notFound(async () => {
  return new Response('Not found', {
    status: 404,
  })
})

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (env.ENVIRONMENT !== 'production') return
    const trigger = event.cron

    if (!CRONS.has(trigger)) {
      console.error(`No cronjob found for trigger ${trigger}`)
      return
    }

    const cron = CRONS.get(trigger)!

    // eslint-disable-next-line no-console
    console.info(`Running cronjob ${trigger}`)

    const octokit = new $Octokit({
      auth: env.GITHUB_TOKEN,
    })

    await cron.handler({
      event,
      env,
      ctx,
      octokit,
    })
  },
  async fetch(request: Request, env: Env) {
    return await app.fetch(request, env)
  },
}
