import mri from "mri";
import type { Cronjob } from "../../types";
import { addReaction, removeNotification, sayHello, swapReaction } from "../../utils";
import { MENTION_ACTIONS } from "./actions";

const ALLOWED_RUNNERS = [
  "luxass",
];

// Support escaped quotes within quotes. https://stackoverflow.com/a/5696141/11934042
const TOKENISE_REGEX
  = /\S+="[^"\\]*(?:\\.[^"\\]*)*"|"[^"\\]*(?:\\.[^"\\]*)*"|\S+/g;

function tokenize(command: string): string[] {
  let matches;
  const output: string[] = [];
  // eslint-disable-next-line no-cond-assign
  while ((matches = TOKENISE_REGEX.exec(command))) {
    output.push(matches[0]);
  }
  return output;
}

export default {
  trigger: "*/1 * * * *",
  async handler({ ctx, env, octokit }) {
    const { data: notifications } = await octokit.request("GET /notifications");

    if (!notifications.length) {
      // eslint-disable-next-line no-console
      console.debug("no notifications found");
      return;
    }

    const mentions = notifications.filter((notification) => {
      return notification.reason === "mention";
    });

    if (!mentions.length) {
      // eslint-disable-next-line no-console
      console.debug("no mentions was found in notifications");
      return;
    }

    ctx.waitUntil(Promise.all((mentions).map(async (mention) => {
      const removed = await removeNotification(octokit, +mention.id);
      if (!removed) {
        console.error(`failed to remove notification ${mention.id}`);
      }

      const issueNumber = +(mention.subject.url.split("/").pop() ?? 0);
      const commentId = +(mention.subject.latest_comment_url.split("/").pop() ?? 0);

      // eslint-disable-next-line no-console
      console.info({
        subjectUrl: mention.subject.url,
        issueNumber,
        commentUrl: mention.subject.latest_comment_url,
        commentId,
      });

      let commentBody: string | undefined | null;
      let commentUserLogin: string;

      // the last comment is the issue body
      if (mention.subject.url === mention.subject.latest_comment_url) {
        // get issue from mention
        const { data: issue } = await octokit.request("GET /repos/{owner}/{repo}/issues/{issue_number}", {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          issue_number: issueNumber,
        });

        commentBody = issue.body;
        if (!issue.user) {
          throw new Error("issue.user is undefined");
        }
        commentUserLogin = issue.user!.login!;
      } else {
        // get comment from mention
        const { data: comment } = await octokit.request("GET /repos/{owner}/{repo}/issues/comments/{comment_id}", {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          comment_id: commentId,
        });

        commentBody = comment.body;
        if (!comment.user) {
          throw new Error("comment.user is undefined");
        }
        commentUserLogin = comment.user!.login!;
      }

      if (commentUserLogin == null) {
        throw new Error("no comment user login found");
      }

      const body = (commentBody || "").replace(/@[a-z0-9-]+/g, "").trim();

      // eslint-disable-next-line no-console
      console.info(`comment body: ${body}`);

      // if user is not allowed to run commands, will just say hello to the user
      if (!ALLOWED_RUNNERS.includes(commentUserLogin)) {
        // eslint-disable-next-line no-console
        console.debug(`user ${commentUserLogin} is not allowed to run commands`);
        return await sayHello(octokit, issueNumber, mention);
      }

      const firstLine = body.split(/\r?\n/)[0].trim();
      let isCommand = false;

      let reactionId: number | null = null;

      if (firstLine.length > 2 && firstLine.charAt(0) === "/") {
        // eslint-disable-next-line no-console
        console.debug(
          "The first line of the comment is a valid slash command.",
        );

        isCommand = true;
        reactionId = await addReaction(octokit, {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          commentId,
          emoji: "+1",
        });
      }

      if (!isCommand) {
        return await sayHello(octokit, issueNumber, mention);
      }

      // eslint-disable-next-line no-console
      console.info({
        body,
        isCommand,
        firstLine,
      });

      const tokenizedAction = tokenize(firstLine.slice(1));
      // eslint-disable-next-line no-console
      console.debug(`command tokens: ${tokenizedAction}`);
      const action = Array.from(MENTION_ACTIONS).find(({ command }) => command === tokenizedAction[0]);

      if (!action) {
        console.warn(`action ${tokenizedAction[0]} not found`);

        reactionId = await swapReaction(octokit, {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          commentId,
          emoji: "confused",
          reactionId: reactionId ?? 0,
        });

        return;
      }

      const args = mri(tokenizedAction.slice(1), {
        ...action.options,
        boolean: [
          "debug",
        ],
        default: {
          debug: false,
        },
      });

      try {
        await action.handler({
          octokit,
          args,
          env,
          mention,
        });
        // eslint-disable-next-line no-console
        console.info(`action ${tokenizedAction[0]} executed successfully`);
      } catch (err) {
        console.error(`failed to execute action ${tokenizedAction[0]}`, err);
        await swapReaction(octokit, {
          owner: mention.repository.owner.login,
          repo: mention.repository.name,
          commentId,
          emoji: "-1",
          reactionId: reactionId ?? 0,
        });
      }
    })));
  },
} satisfies Cronjob;
