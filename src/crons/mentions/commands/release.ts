import { inc } from 'semver'
import type { SlashCommand } from '../../../types'

export default {
  command: 'release',
  async handler({ octokit, mention }) {
    const issueNumber = +(mention.subject.url.split('/').pop() ?? 0)

    // read the current version of the package.json in root
    const { data: packageJson } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: mention.repository.owner.login,
      repo: mention.repository.name,
      path: 'package.json',
    })

    if (!('content' in packageJson)) {
      return
    }

    // parse the content of the package.json
    // eslint-disable-next-line node/prefer-global/buffer
    const packageJsonContent = Buffer.from(packageJson.content, 'base64').toString('utf-8')

    // if no command is found, will just say hallo to the user
    const { data: createdComment } = await octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: mention.repository.owner.login,
        repo: mention.repository.name,
        issue_number: issueNumber,
        body: `I will release it soon: current version ${JSON.parse(packageJsonContent).version} -> ${inc(JSON.parse(packageJsonContent).version, 'patch')}`,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )
    if (!createdComment) {
      console.error(`failed to create comment for issue ${issueNumber}`)
    }
  },
} satisfies SlashCommand
