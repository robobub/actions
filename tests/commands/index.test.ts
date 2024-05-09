import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COMMANDS, registerCommand } from '../../src/commands'
import type { SlashCommand } from '../../src/types'

describe('registerCommand', () => {
  beforeEach(() => {
    COMMANDS.clear()
  })

  it('should register a new command', () => {
    const command = {
      command: 'test',
      handler: vi.fn(),
    } satisfies SlashCommand
    registerCommand(command)
    expect(COMMANDS.has(command)).toBe(true)
  })

  it('should register multiple commands', () => {
    const command1 = {
      command: 'test1',
      handler: vi.fn(),
    } satisfies SlashCommand
    const command2 = {
      command: 'test2',
      handler: vi.fn(),
    } satisfies SlashCommand
    registerCommand(command1)
    registerCommand(command2)
    expect(COMMANDS.has(command1)).toBe(true)
    expect(COMMANDS.has(command2)).toBe(true)
  })

  it('should throw an error if command is already registered', () => {
    const command = {
      command: 'test',
      handler: vi.fn(),
    } satisfies SlashCommand
    registerCommand(command)
    expect(() => registerCommand(command)).toThrowError('Command test already registered')
  })
})
