import type { GitHubMention } from "./crons/mentions/types";
import type { Octokit } from "./types";

export async function removeNotification(octokit: Octokit, threadId: number): Promise<boolean> {
  try {
    await octokit.request("PATCH /notifications/threads/{thread_id}", {
      thread_id: threadId,
    });
    await octokit.request(
      "PUT /notifications/threads/{thread_id}/subscription",
      {
        thread_id: threadId,
        ignored: true,
      },
    );

    return true;
  } catch {
    return false;
  }
}

interface AddReactionOptions {
  repo: string;
  owner: string;
  emoji: | "+1"
  | "-1"
  | "laugh"
  | "confused"
  | "heart"
  | "hooray"
  | "rocket"
  | "eyes";
  commentId: number;
}

/**
 * Adds a reaction to a comment on a GitHub issue.
 *
 * @param {Octokit} octokit - The Octokit instance.
 * @param {AddReactionOptions} options - The reaction options.
 * @returns The ID of the added reaction, or null if an error occurred.
 */
export async function addReaction(octokit: Octokit, options: AddReactionOptions): Promise<number | null> {
  try {
    const { data } = await octokit.request("POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions", {
      repo: options.repo,
      owner: options.owner,
      comment_id: options.commentId,
      content: options.emoji,
    });

    return data.id;
  } catch {
    return null;
  }
}

interface RemoveReactionOptions {
  repo: string;
  owner: string;
  commentId: number;
  reactionId: number;
}

/**
 * Removes a reaction from a comment in a GitHub repository.
 *
 * @param {Octokit} octokit - The Octokit instance used to make API requests.
 * @param {RemoveReactionOptions} options - The options for removing the reaction.
 * @returns A Promise that resolves when the reaction is successfully removed.
 */
export async function removeReaction(octokit: Octokit, options: RemoveReactionOptions) {
  await octokit.request("DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}", {
    repo: options.repo,
    owner: options.owner,
    comment_id: options.commentId,
    reaction_id: options.reactionId,
  });
}

/**
 * Swaps a reaction on a comment in a GitHub repository, removing the old reaction and adding a new one.
 *
 * @param {Octokit} octokit - The Octokit instance used to make API requests.
 * @param {AddReactionOptions & RemoveReactionOptions} options - The options for swapping the reaction.
 * @returns A promise that resolves when the reaction has been swapped.
 */
export async function swapReaction(octokit: Octokit, options: AddReactionOptions & RemoveReactionOptions) {
  await removeReaction(octokit, {
    repo: options.repo,
    owner: options.owner,
    commentId: options.commentId,
    reactionId: options.reactionId,
  });

  return addReaction(octokit, options);
}

const MESSAGES = [
  "Hello! 👋🏼",
  "Hi! 👋🏼",
  "Hey! 👋🏼",
  "Howdy! 👋🏼",
  "Yo! 👋🏼",
  "Hi there! 👋🏼",
];

export async function sayHello(octokit: Octokit, issueNumber: number, mention: GitHubMention) {
  try {
    const { data: createdComment } = await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: mention.repository.owner.login,
        repo: mention.repository.name,
        issue_number: issueNumber,
        body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)] || "Hmmm, this is rare. I don't know what to say.",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!createdComment) {
      console.error("something went wrong while trying to say hello!");
    }
  } catch (err) {
    console.error(err);
  }
}
