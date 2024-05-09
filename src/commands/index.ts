import type { SlashCommand } from '../types'

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
