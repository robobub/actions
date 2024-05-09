import type { SlashCommand } from '../../../types'

export default {
  command: 'release',
  async handler() {
    // eslint-disable-next-line no-console
    console.info('release command')
  },
} satisfies SlashCommand
