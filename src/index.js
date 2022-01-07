const core = require('@actions/core');
const bumpVersion = require('./bumper');
const { exitSuccess, logError, exitFailure } = require('./utils');

(async () => {
  try {
    const tagPrefix = core.getInput('tag-prefix');
    const minorWording = core.getInput('minor-wording');
    const majorWording = core.getInput('major-wording');
    const patchWording = core.getInput('patch-wording');
    const rcWording = core.getInput('release-candidate-wording');
    const skipTag = core.getBooleanInput('skip-tag');
    const skipCommit = core.getBooleanInput('skip-commit');
    const skipPush = core.getBooleanInput('skip-push');
    const pathToDocument = core.getInput('path-to-asyncapi');
    const targetBranch=  core.getInput('target-branch');
    const preReleaseId = core.getInput('pre-release-id');
    const commitMessageToUse = core.getInput('commit-message');
    const newVersion = await bumpVersion(tagPrefix,
      minorWording,
      majorWording,
      patchWording,
      rcWording,
      skipTag,
      skipCommit,
      skipPush,
      pathToDocument,
      targetBranch,
      preReleaseId,
      commitMessageToUse);
    if (newVersion) {
      core.setOutput('newVersion', newVersion);
      exitSuccess('Version bumped!');
    }
  } catch (err) {
    logError(err);
    exitFailure('Failed to bump version');
  }
})();