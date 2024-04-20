// @ts-check

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
    // await removeNotification(github, +mention.id)

    core.info(`Mention from ${mention.repository.full_name}`)
    core.info(JSON.stringify(mention, null, 2))
    core.info('\n\n-----\n\n')

    const splittedCommentUrl = mention.subject.latest_comment_url.split('/')

    if (!splittedCommentUrl.pop()) {
      console.error('No comment id found')
      return
    }

    const commentId = +(splittedCommentUrl.pop() ?? 0)

    // get comment from mention
    const { data: comment } = await github.request('GET /repos/{owner}/{repo}/issues/comments/{comment_id}', {
      owner: mention.repository.owner.login,
      repo: mention.repository.name,
      comment_id: commentId,
    })

    const body = comment.body || ''

    core.debug(`comment body: ${body}`)

    // const { data: createdComment } = await github.request(
    //   'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
    //   {
    //     owner: mention.repository.owner.login,
    //     repo: mention.repository.name,
    //     issue_number: issueNumber,
    //     body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)] || 'Hmmm, this is rare. I don\'t know what to say.',
    //     headers: {
    //       'X-GitHub-Api-Version': '2022-11-28',
    //     },
    //   },
    // )
    // if (!createdComment) {
    //   console.error('Something went wrong while trying to create a comment!')
    // }
  }))
}
