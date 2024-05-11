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
import indexPage from './assets/index.html'
import { CRONS } from './crons'
import { verifySignature } from './utils'

const $Octokit = Octokit.plugin(paginateRest)

const app = new Hono<HonoContext>()
app.use('*', logger())
app.use(prettyJSON())

app.get('/', async (ctx) => {
  const index = indexPage
    .replaceAll('{{ ENVIRONMENT }}', ctx.env.ENVIRONMENT)
    .replaceAll('{{ STRINGIFIED_ENVIRONMENT }}', ctx.env.ENVIRONMENT === 'staging' ? 'staging.' : '')
    .replaceAll('{{ URL }}', `https://${ctx.env.ENVIRONMENT === 'staging' ? 'staging.' : ''}robobub.luxass.dev`)
    .replaceAll('{{ OG_URL }}', `https://image.luxass.dev/api/image/random-emoji`)
  return ctx.html(index)
})

app.post('/webhook', async (ctx) => {
  if (!ctx.req.header('x-hub-signature-256')) {
    return ctx.json({
      message: 'missing signature',
    }, {
      status: 400,
    })
  }

  const body = await ctx.req.json()

  if (!verifySignature(
    ctx.env.WEBHOOK_SECRET,
    ctx.req.header('x-hub-signature-256')!,
    body,
  )) {
    return ctx.json({
      message: 'invalid signature',
    }, {
      status: 400,
    })
  }

  return ctx.json({
    message: 'payload was received successfully',
  })
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
