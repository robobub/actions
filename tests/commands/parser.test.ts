import { describe, expect, it } from 'vitest'
import { parse, tokenize } from '../../src/commands/parser'

describe('tokenize', () => {
  it('should tokenize a command with arguments', () => {
    const command = 'echo "Hello, World!"'
    const expectedTokens = ['echo', '"Hello, World!"']
    const actualTokens = tokenize(command)
    expect(actualTokens).toEqual(expectedTokens)
  })

  it('should tokenize a command with named arguments', () => {
    const command = 'echo message="Hello, World!"'
    const expectedTokens = ['echo', 'message="Hello, World!"']
    const actualTokens = tokenize(command)
    expect(actualTokens).toEqual(expectedTokens)
  })

  it('should tokenize a command without arguments', () => {
    const command = 'ls'
    const expectedTokens = ['ls']
    const actualTokens = tokenize(command)
    expect(actualTokens).toEqual(expectedTokens)
  })

  it('should tokenize a command with escaped quotes', () => {
    const command = 'echo "Hello, \\"World!\\""'
    const expectedTokens = ['echo', '"Hello, \\"World!\\""']
    const actualTokens = tokenize(command)
    expect(actualTokens).toEqual(expectedTokens)
  })

  it('should tokenize a command with multiple arguments', () => {
    const command = 'echo Hello World!'
    const expectedTokens = ['echo', 'Hello', 'World!']
    const actualTokens = tokenize(command)
    expect(actualTokens).toEqual(expectedTokens)
  })
})

describe('parse', () => {
  it('should parse tokens and arguments', () => {
    const tokens = ['echo', 'Hello', 'World']
    const expectedPayload = {
      command: 'echo',
      args: {
        _: 'Hello World',
      },
    }
    const actualPayload = parse(tokens, {})
    expect(actualPayload).toEqual(expectedPayload)
  })

  it('should parse tokens and named arguments', () => {
    const tokens = ['echo', 'message="Hello, World!"']

    const expectedPayload = {
      command: 'echo',
      args: {
        _: 'message="Hello, World!"',
        message: 'Hello, World!',
      },
    }
    const actualPayload = parse(tokens, {
      message: {
        type: 'string',
        required: true,
      },
    })
    expect(actualPayload).toEqual(expectedPayload)
  })

  it('should parse tokens and named arguments with default', () => {
    const tokens = ['echo']

    const expectedPayload = {
      command: 'echo',
      args: {
        _: 'message="Hello, World!"',
        message: 'Hello, World!',
      },
    }
    const actualPayload = parse(tokens, {
      message: {
        type: 'string',
        required: true,
        default: 'Hello, World!',
      },
    })
    expect(actualPayload).toEqual(expectedPayload)
  })

  it.skip('should parse tokens and named arguments with default with defined arg', () => {
    const tokens = ['echo', 'Hello!']

    const expectedPayload = {
      command: 'echo',
      args: {
        _: 'message="Hello!"',
        message: 'Hello!',
      },
    }
    const actualPayload = parse(tokens, {
      message: {
        type: 'string',
        required: true,
        default: 'Hello, World!',
      },
    })
    expect(actualPayload).toEqual(expectedPayload)
  })

  it('should parse tokens without arguments', () => {
    const tokens = ['ls']
    const args = {}
    const expectedPayload = {
      command: 'ls',
      args: {
        _: '',
      },
    }
    const actualPayload = parse(tokens, args)
    expect(actualPayload).toEqual(expectedPayload)
  })

  it('should return null when required argument is missing', () => {
    const tokens = ['ls']
    const actualPayload = parse(tokens, {
      message: {
        type: 'string',
        required: true,
      },
    })
    expect(actualPayload).toEqual(null)
  })
})
