// @ts-check

const MESSAGES = [
  'Hello! 👋🏼',
  'Hi! 👋🏼',
  'Hey! 👋🏼',
  'Howdy! 👋🏼',
  'Yo! 👋🏼',
  'Hi there! 👋🏼',
]

/**
 * @typedef {import('../../async-function').AsyncFunctionArguments} AsyncFunctionArguments
 */

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
export default async ({ core, github }) => {
  core.debug('running say-hello action')
  core.info('Hello, World!')

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

    if (!mention.subject.url) {
      console.error('No mention subject URL found')
      return
    }

    const splittedUrl = mention.subject.url.split('/')

    if (!splittedUrl.pop()) {
      console.error('No issue number found')
      return
    }

    const issueNumber = +(splittedUrl.pop() ?? 0)

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
      console.error('Something went wrong while trying to create a comment!')
    }
  }))
}
