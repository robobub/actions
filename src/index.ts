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

const encoder = new TextEncoder()

async function verifySignature(secret: string, header: string, payload: any) {
  const parts = header.split('=')
  const sigHex = parts[1]

  const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } }

  const keyBytes = encoder.encode(secret)
  const extractable = false
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    algorithm,
    extractable,
    ['sign', 'verify'],
  )

  const sigBytes = hexToBytes(sigHex)
  const dataBytes = encoder.encode(payload)
  const equal = await crypto.subtle.verify(
    algorithm.name,
    key,
    sigBytes,
    dataBytes,
  )

  return equal
}

function hexToBytes(hex: string) {
  const len = hex.length / 2
  const bytes = new Uint8Array(len)

  let index = 0
  for (let i = 0; i < hex.length; i += 2) {
    const c = hex.slice(i, i + 2)
    const b = Number.parseInt(c, 16)
    bytes[index] = b
    index += 1
  }

  return bytes
}

app.post('/webhook', async (ctx) => {
  if (!ctx.req.header('x-hub-signature-256')) {
    return ctx.json({
      message: 'Missing signature',
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
    console.log('doesn\'t match')
    return ctx.json({
      message: 'Invalid signature',
    }, {
      status: 400,
    })
  }

  console.log('body', body)

  return ctx.json({
    message: 'Hello, world!',
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
