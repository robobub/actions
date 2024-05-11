import type { Octokit as _Octokit } from '@octokit/core'
import type { PaginateInterface } from '@octokit/plugin-paginate-rest'

export interface HonoContext {
  Bindings: {
    GITHUB_TOKEN: string
    ENVIRONMENT: 'staging' | 'production'
    WEBHOOK_SECRET: string
  }
}

export type Octokit = _Octokit & {
  paginate: PaginateInterface
}

export type Env = HonoContext['Bindings']

interface CronCtx {
  event: ScheduledEvent
  env: Env
  ctx: ExecutionContext
  octokit: Octokit
}

export type Cronhandler = (ctx: CronCtx) => Promise<void>

export interface Cronjob {
  trigger: string
  handler: Cronhandler
}
