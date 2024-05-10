import type { SlashCommand } from '../../../types'
import release from './release'
import testArgs from './test-args'

export const COMMANDS: Set<SlashCommand> = new Set()

/**
 * Registers a slash command.
 * @param {SlashCommand} command - The slash command to register.
 */
export function registerCommand(command: SlashCommand): void {
  const allCommands = [...COMMANDS].map((c) => c.command)
  if (allCommands.includes(command.command)) {
    throw new Error(`Command ${command.command} already registered`)
  }
  COMMANDS.add(command)
  // eslint-disable-next-line no-console
  console.debug('registered command', command.command)
}

registerCommand(release)
registerCommand(testArgs)
