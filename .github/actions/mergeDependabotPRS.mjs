import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { approveAndMergePR } from './util/prProcess.mjs';
import { runInSequence } from './util/promise.mjs';

const run = async () => {
  const {
    GITHUB_TOKEN,
    ORG_FULL_GITHUB_TOKEN,
  } = process.env;
  const ghActionsOctokit = new Octokit({
    auth: GITHUB_TOKEN,
  });
  const orgOctokit = new Octokit({
    auth: ORG_FULL_GITHUB_TOKEN,
  });
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  const { data: prsMetadata } = await ghActionsOctokit.rest.pulls.list({ owner, repo });

  const approveAndMergePRPromiseFns = prsMetadata
    .filter(({
      user, head, draft, state,
    }) => user.login === 'dependabot[bot]' && head.ref.startsWith('dependabot/') &&
        draft === false && state === 'open')
    .map(({ number, html_url }) => () => approveAndMergePR({
      octokit: ghActionsOctokit,
      orgOctokit,
      prNumber: number,
      owner,
      repo,
      htmlURL: html_url,
    }));

  await runInSequence(approveAndMergePRPromiseFns);
};

run()
  .catch((error) => core.setFailed(error.message));
