// Tokenise command and arguments

import type { SlashCommandArg } from '../types'

// Support escaped quotes within quotes. https://stackoverflow.com/a/5696141/11934042
const TOKENISE_REGEX
  = /\S+="[^"\\]*(?:\\.[^"\\]*)*"|"[^"\\]*(?:\\.[^"\\]*)*"|\S+/g
const NAMED_ARG_REGEX = /^(?<name>[a-zA-Z0-9_-]+)=(?<value>.+)$/
const MAX_ARGS = 5

export function tokenize(command: string): string[] {
  let matches
  const output: string[] = []
  // eslint-disable-next-line no-cond-assign
  while ((matches = TOKENISE_REGEX.exec(command))) {
    output.push(matches[0])
  }
  return output
}

export interface ParseResult {
  command: string
  args: Record<string, string>
}

export function parse(tokens: string[], args: Record<string, SlashCommandArg>): ParseResult | null {
  const payload: ParseResult = {
    command: tokens[0],
    args: {
      _: '',
    },
  }
  const argWords
    = tokens.length > 1 ? tokens.slice(1, MAX_ARGS + 1) : []

  for (const [argName, arg] of Object.entries(args)) {
    if (arg.default) {
      argWords.push(`${argName}="${arg.default}"`)
      payload.args[argName] = arg.default
    }
    if (arg.required && !argWords.some((arg) => arg.startsWith(`${argName}=`))) {
      return null
    }
  }

  console.log({
    argWords,
    args,
  })

  if (argWords.length > 0) {
    payload.args._ = argWords.join(' ')

    for (const argWord of argWords) {
      if (NAMED_ARG_REGEX.test(argWord)) {
        const result = NAMED_ARG_REGEX.exec(argWord)
        if (result && result.groups) {
          const argName = result.groups.name
          const argValue = stripQuotes(result.groups.value)
          payload.args[argName] = argValue !== undefined ? argValue : args[argName]?.default
        }
      }
    }
  }

  console.info({
    payload,
  })
  return payload
}

function stripQuotes(input: string): string {
  if (input.startsWith(`"`) && input.endsWith(`"`)) {
    return input.slice(1, input.length - 1)
  } else {
    return input
  }
}
