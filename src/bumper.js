const { execSync } = require('child_process');
const {
  getAsyncAPIDocument,
  exitSuccess,
  exitFailure,
  logError,
  runInWorkspace,
  bump
} = require('./utils')

module.exports = async (
  tagPrefix,
  minorWording,
  majorWording,
  patchWording,
  rcWording,
  skipTag,
  skipCommit,
  skipPush,
  pathToDocument,
  targetBranch,
  defaultBumpVersion,
  preReleaseId,
  commitMessage) => {
  const document = getAsyncAPIDocument(pathToDocument);
  const currentVersion = document.info.version.toString();

  let version = defaultBumpVersion;
  let preId = preReleaseId;

  // case: if default=prerelease, but rc-wording is NOT set
  if (version === 'prerelease' && preId) {
    version = 'prerelease';
    version = `${version} --preId=${preId}`;
  }

  logInfo('version action after final decision:', version);

  // case: if nothing of the above matches
  if (version === null) {
    logInfo('No version keywords found, skipping bump.');
    return;
  }

  let currentVersionBranch = /refs\/[a-zA-Z]+\/(.*)/.exec(process.env.GITHUB_REF)[1];
  let isPullRequest = false;
  if (process.env.GITHUB_HEAD_REF) {
    // Comes from a pull request
    currentVersionBranch = process.env.GITHUB_HEAD_REF;
    isPullRequest = true;
  }
  if (targetBranch !== '') {
    // We want to override the branch that we are pulling / pushing to
    currentVersionBranch = targetBranch;
  }
  logInfo('currentVersionBranch:', currentVersionBranch);
  logInfo('Current version:', currentVersion, '/', 'version:', version);

  //Bump version
  const rawNewVersion = bumpVersion(currentVersion, bumpMajorVersion, bumpMinorVersion, bumpPatchVersion);
  const completeNewVersion = `${tagPrefix}${rawNewVersion}`;


  // now go to the actual branch to perform the same versioning
  if (isPullRequest) {
    // First fetch to get updated local version of branch
    await runInWorkspace('git', ['fetch']);
  }
  return completeNewVersion;
}
