import * as core from '@actions/core';
import { isPRStateCalculated, isPRMerged, isPRClosed, isPRRebased, isPRReadyToMerge } from './prState.mjs';
import { logExitMessage } from './logger.mjs';

export const approveAndMergePR = async (args) => {
  if (!await isPRStateCalculated(args)) {
    logExitMessage(args, 'Failed to calculate state for PR');
    return;
  }

  if (await isPRMerged(args) || await isPRClosed(args)) {
    logExitMessage(args);
    return;
  }

  if (!await isPRRebased(args, true)) {
    await requestDependabotRebase(args);

    if (!await isPRRebased(args)) {
      logExitMessage(args, 'Failed to rebase PR');
      return;
    }
  }

  await approvePR(args);

  if (!await isPRReadyToMerge(args)) {
    logExitMessage(args);
    return;
  }

  await mergePR(args);
};

const requestDependabotRebase = async ({ orgOctokit, owner, repo, prNumber }) => {
  await orgOctokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: 'COMMENT',
    body: '@dependabot rebase',
  });

  core.info(`Requested Dependabot to rebase PR #${prNumber}`);
};

const approvePR = async ({ octokit, orgOctokit, owner, repo, prNumber }) => {
  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: 'APPROVE',
  });

  core.info(`PR #${prNumber} approved by github-actions user`);

  await orgOctokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: 'APPROVE',
  });

  core.info(`PR #${prNumber} approved by organization user`);
};

const mergePR = async ({ octokit, owner, repo, prNumber, htmlURL }) => {
  await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
  });

  core.info(`Merged PR #${prNumber} (${htmlURL})\n`);
};
