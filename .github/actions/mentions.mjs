// @ts-check

/**
 * @typedef {import('../../async-function').AsyncFunctionArguments} AsyncFunctionArguments
 */

const MESSAGES = [
  'Hello! 👋🏼',
  'Hi! 👋🏼',
  'Hey! 👋🏼',
  'Howdy! 👋🏼',
  'Yo! 👋🏼',
  'Hi there! 👋🏼',
]

/**
 * @type {Array<{name: string, command: RegExp, action: (ctx: AsyncFunctionArguments) => Promise<void>}>}
 */
const COMMANDS = [
  {
    name: 'release',
    command: /release/,
    async action() {
      // eslint-disable-next-line no-console
      console.log('release command')
    },
  },
]

/**
 * @typedef {AsyncFunctionArguments["github"]} GitHub
 */

/**
 * @param {GitHub} github
 * @param {number} threadId
 */
async function removeNotification(github, threadId) {
  try {
    await github.request('PATCH /notifications/threads/{thread_id}', {
      thread_id: threadId,
    })
    await github.request(
      'PUT /notifications/threads/{thread_id}/subscription',
      {
        thread_id: threadId,
        ignored: true,
      },
    )

    return true
  } catch (e) {
    return false
  }
}

/** @param {AsyncFunctionArguments} AsyncFunctionArguments */
export default async ({
  core,
  github,
  __original_require__,
  context,
  exec,
  glob,
  io,
  require,
}) => {
  core.info('running mentions action')

  const { data: notifications } = await github.request('GET /notifications')

  if (!notifications.length) {
    console.warn('No notifications found')
    return
  }

  const mentions = notifications.filter((notification) => {
    return notification.reason === 'mention'
  })

  if (!mentions.length) {
    console.warn('found notifications, but no mentions')
    return
  }

  await Promise.all((mentions).map(async (mention) => {
    await removeNotification(github, +mention.id)

    const issueNumber = +(mention.subject.url.split('/').pop() ?? 0)
    const commentId = +(mention.subject.latest_comment_url.split('/').pop() ?? 0)

    // get comment from mention
    const { data: comment } = await github.request('GET /repos/{owner}/{repo}/issues/comments/{comment_id}', {
      owner: mention.repository.owner.login,
      repo: mention.repository.name,
      comment_id: commentId,
    })

    const body = (comment.body || '').replace(/@[a-z0-9-]+/g, '').trim()

    core.info(`comment body: ${body}`)

    const command = COMMANDS.find(({ command }) => command.test(body))

    if (!command) {
      // if no command is found, will just say hallo to the user
      const { data: createdComment } = await github.request(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          issue_number: issueNumber,
          body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)] || 'Hmmm, this is rare. I don\'t know what to say.',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )
      if (!createdComment) {
        core.setFailed('something went wrong while trying to say hello!')
      }

      return
    }

    try {
      await command.action({
        core,
        github,
        __original_require__,
        context,
        exec,
        glob,
        io,
        require,
      })
      core.info('command executed')
    } catch (err) {
      core.setFailed(`command ${command.name} failed to execute`)
    }
  }))
}
