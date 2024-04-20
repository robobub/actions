/// <reference types="node" />
import type * as core from '@actions/core'
import type * as exec from '@actions/exec'
import type { Context } from '@actions/github/lib/context'
import type { GitHub } from '@actions/github/lib/utils'
import type * as glob from '@actions/glob'
import type * as io from '@actions/io'

export declare interface AsyncFunctionArguments {
  context: Context
  core: typeof core
  github: InstanceType<typeof GitHub>
  exec: typeof exec
  glob: typeof glob
  io: typeof io
  require: NodeRequire
  __original_require__: NodeRequire
}
export declare function callAsyncFunction<T>(args: AsyncFunctionArguments, source: string): Promise<T>
