import * as core from '@actions/core';
import { logPRState } from './logger.mjs'
import { tryUntilTrue } from './promise.mjs';

export const isPRMerged = async ({ octokit, owner, repo, prNumber }) => {
  const { data: { merged } } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  core.info(`PR #${prNumber} is ${merged ? 'merged' : 'not merged'}`);

  return merged === true;
};

export const isPRClosed = async ({ octokit, owner, repo, prNumber }) => {
  const { data: { state } } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const isClosed = state === 'closed';

  if (isClosed) {
    core.info(`PR #${prNumber} is closed`);
  }

  return isClosed;
};

export const isPRStateCalculated = async ({ octokit, owner, repo, prNumber }) => {
  core.info(`Calculating PR #${prNumber} state`);

  const asyncIterationFn = async () => {
    const {
      data: {
        mergeable, mergeable_state, rebaseable, state,
      },
    } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    logPRState({ mergeable, mergeable_state, rebaseable, prNumber });

    return (state === 'open' && mergeable_state !== 'unknown' && mergeable !== null && rebaseable !== null) ||
      state === 'closed';
  };

  return tryUntilTrue(asyncIterationFn);
};

export const isPRRebased = async ({ octokit, owner, repo, prNumber }, hasSingleIteration = false) => {
  core.info(`Checking if PR #${prNumber} is rebased`);

  const asyncIterationFn = async () => {
    const { data: { mergeable, mergeable_state, rebaseable } } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Cam be still in "blocked" merge state due to branch protection rules
    const REBASED_MERGE_STATES = ['blocked', 'clean'];
    const isRebased = REBASED_MERGE_STATES.includes(mergeable_state) && mergeable === true && rebaseable === true;

    logPRState({ mergeable, mergeable_state, rebaseable, prNumber });
    core.info(`PR #${prNumber} is ${isRebased ? 'rebased' : 'not rebased'}`);

    return isRebased;
  };

  if (hasSingleIteration) {
    return asyncIterationFn();
  }

  return tryUntilTrue(asyncIterationFn);
};

export const isPRReadyToMerge = async ({ octokit, owner, repo, prNumber }) => {
  const { data: { mergeable, mergeable_state, rebaseable } } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const isMergeable = mergeable_state === 'clean';

  if (!isMergeable) {
    core.info(`PR #${prNumber} has non-mergeable state`);
  }

  logPRState({ mergeable, mergeable_state, rebaseable, prNumber });

  return isMergeable;
};
