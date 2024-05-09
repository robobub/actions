import type { SlashCommand } from '../../../types'

export default {
  command: 'test',
  args: {
    arg1: {
      type: 'string',
      required: true,
    },
    arg2: {
      type: 'number',
      required: false,
      default: 42,
    },
    arg3: {
      type: 'boolean',
      required: true,
      default: true,
    },
  },
  async handler({
    args,
  }) {
    // eslint-disable-next-line no-console
    console.info('test command', args)
  },
} satisfies SlashCommand
