import * as core from '@actions/core';
import { execSync } from 'child_process';

export const runInSequence = (promiseFns) => {
  return promiseFns.reduce((previousPromiseFn, nextPromiseFn) => {
    return previousPromiseFn.then(nextPromiseFn);
  }, Promise.resolve());
};

export const tryUntilTrue = async (asyncCallback) => {
    const BASE_RETRY_INTERVAL_SECONDS = 2;
    const MAX_ATTEMPTS = 6;

    for (let currentAttempt = 1; currentAttempt <= MAX_ATTEMPTS; currentAttempt++) {
      core.info(`Attempt number: ${currentAttempt}`);

      if (await asyncCallback()) {
        return true;
      }

      const EXPONENTIAL_RETRY_INTERVAL = Math.pow(BASE_RETRY_INTERVAL_SECONDS, currentAttempt);

      execSync(`sleep ${EXPONENTIAL_RETRY_INTERVAL}`);
    }

    return false;
};
