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
    const packageJsonContent = JSON.parse(atob(packageJson.content))

    const packageName = packageJsonContent.name
    const currentVersion = packageJsonContent.version
    const nextVersion = inc(currentVersion, 'patch')

    if (!packageName || !currentVersion || !nextVersion) {
      throw new Error('failed to parse package.json')
    }

    // list all npm version
    const npm = await fetch(`https://registry.npmjs.org/${packageName}`, {
      headers: {
        'User-Agent': 'robobub actions',
      },
    }).then((res) => res.json())

    if (!npm || typeof npm !== 'object' || !('versions' in npm) || typeof npm.versions !== 'object' || !npm.versions) {
      throw new Error('failed to fetch npm versions')
    }

    const hasNextVersion = nextVersion in npm.versions

    let comment = 'Hi, @luxass. \n\n'

    if (hasNextVersion) {
      comment += `The version ${nextVersion} is already published.\n\nThese are the versions that are already published:\n\n - ${Object.keys(npm.versions).join('\n - ')}`
    } else {
      comment += `I'm going to try and create a release for this version soon. \n\nBumping package version from ${currentVersion} -> ${nextVersion}.`
    }

    // if no command is found, will just say hallo to the user
    const { data: createdComment } = await octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: mention.repository.owner.login,
        repo: mention.repository.name,
        issue_number: issueNumber,
        body: comment,
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
