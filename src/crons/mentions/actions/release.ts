import { gt, inc } from 'semver'
import type { MentionAction } from '../types'

export default {
  command: 'release',
  options: {
    default: {
      type: 'patch',
    },
  },
  async handler({ octokit, mention, args }) {
    if (args.type !== 'patch' && args.type !== 'minor' && args.type !== 'major') {
      args.type = 'patch'
    }

    const {
      debug,
      type,
      version,
    } = args

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
    let nextVersion = inc(currentVersion, type)

    if (version && gt(version, currentVersion)) {
      nextVersion = version
    }

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

    if (debug) {
      const debug = createDebug()
      debug.addSection('versions', JSON.stringify({
        currentVersion,
        nextVersion,
        hasNextVersion,
      }, null, 2), 'json')
      debug.addSection('args', JSON.stringify(args, null, 2), 'json')
      debug.addSection('package.json', JSON.stringify(packageJsonContent, null, 2), 'json')

      comment += debug.build()
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

    if (hasNextVersion) {
      return
    }

    // merge this pull request,
    const { data } = await octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
      owner: mention.repository.owner.login,
      repo: mention.repository.name,
      pull_number: issueNumber,
      merge_method: 'squash',
      commit_title: `chore(release): ${nextVersion}`,
      commit_message: `chore(release): ${nextVersion}`,
    })

    // if the version is not already published
  },
} satisfies MentionAction

function createDebug() {
  let debug = '\n\n\n<details><summary>Debug</summary>'

  return {
    addSection(title: string, content: string, lang = 'json') {
      debug += `\n\n### ${title}\n\n\`\`\`${lang}\n${content}\n\`\`\``
    },
    build() {
      debug += '\n\n</details>'

      return debug
    },
  }
}
