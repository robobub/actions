import { COMMANDS } from '../../commands'
import { parse, tokenize } from '../../commands/parser'
import type { Cronjob } from '../../types'
import { addReaction, removeNotification, sayHello, swapReaction } from '../../utils'
import './commands'

const ALLOWED_RUNNERS = [
  'luxass',
]

export default {
  trigger: '*/1 * * * *',
  async handler({ ctx, env, octokit }) {
    const { data: notifications } = await octokit.request('GET /notifications')

    if (!notifications.length) {
      // eslint-disable-next-line no-console
      console.debug('no notifications found')
      return
    }

    const mentions = notifications.filter((notification) => {
      return notification.reason === 'mention'
    })

    if (!mentions.length) {
      // eslint-disable-next-line no-console
      console.debug('no mentions was found in notifications')
      return
    }

    ctx.waitUntil(Promise.all((mentions).map(async (mention) => {
      const removed = await removeNotification(octokit, +mention.id)
      if (!removed) {
        console.error(`failed to remove notification ${mention.id}`)
      }

      const issueNumber = +(mention.subject.url.split('/').pop() ?? 0)
      const commentId = +(mention.subject.latest_comment_url.split('/').pop() ?? 0)

      // get comment from mention
      const { data: comment } = await octokit.request('GET /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner: mention.repository.owner.login,
        repo: mention.repository.name,
        comment_id: commentId,
      })

      const body = (comment.body || '').replace(/@[a-z0-9-]+/g, '').trim()

      // eslint-disable-next-line no-console
      console.info(`comment body: ${body}`)

      // if user is not allowed to run commands, will just say hello to the user
      if (!ALLOWED_RUNNERS.includes(comment.user?.login ?? '')) {
        // eslint-disable-next-line no-console
        console.debug(`user ${comment.user?.login} is not allowed to run commands`)
        return await sayHello(octokit, issueNumber, mention)
      }

      const firstLine = body.split(/\r?\n/)[0].trim()
      let isCommand = false

      let reactionId: number | null = null

      if (firstLine.length > 2 && firstLine.charAt(0) === '/') {
        // eslint-disable-next-line no-console
        console.debug(
          'The first line of the comment is a valid slash command.',
        )

        isCommand = true
        reactionId = await addReaction(octokit, {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          commentId,
          emoji: '+1',
        })
      }

      if (!isCommand) {
        return await sayHello(octokit, issueNumber, mention)
      }

      // eslint-disable-next-line no-console
      console.info({
        comment,
        body,
        isCommand,
        firstLine,
      })

      const tokenizedCommand = tokenize(firstLine.slice(1))
      // eslint-disable-next-line no-console
      console.debug(`command tokens: ${tokenizedCommand}`)
      const slashCommand = Array.from(COMMANDS).find(({ command }) => command === tokenizedCommand[0])

      if (!slashCommand) {
        console.warn(`command ${tokenizedCommand[0]} not found`)

        await swapReaction(octokit, {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          commentId,
          emoji: 'confused',
          reactionId: reactionId ?? 0,
        })

        return
      }

      const result = parse(tokenizedCommand, slashCommand.args || {})

      if (result == null) {
        console.error('failed to parse command')
        await swapReaction(octokit, {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          commentId,
          emoji: 'confused',
          reactionId: reactionId ?? 0,
        })

        return
      }

      const { args } = result

      await slashCommand.handler({
        octokit,
        args,
        env,
        mention,
      })
    })))
  },
} satisfies Cronjob
