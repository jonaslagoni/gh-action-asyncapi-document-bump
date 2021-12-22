const { execSync } = require('child_process');
const {
  getAsyncAPIDocument,
  exitSuccess,
  exitFailure,
  logError,
  runInWorkspace,
  bump,
  getGitCommits
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
  setGitConfigs();
  const document = getAsyncAPIDocument(pathToDocument);
  const currentVersion = document.info.version.toString();

  let version = defaultBumpVersion;
  let preReleaseId = preReleaseId;

  const commitMessages = getGitCommits();

  const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion, foundPreReleaseId} = analyseVersionChange();


  // case: if prerelease id not explicitly set, use the found prerelease id in commit messages
  if (doPreReleaseVersion && !preReleaseId) {
    preReleaseId = foundPreReleaseId;
  }

  let currentBranch = /refs\/[a-zA-Z]+\/(.*)/.exec(process.env.GITHUB_REF)[1];
  if (process.env.GITHUB_HEAD_REF) {
    // Comes from a pull request
    currentBranch = process.env.GITHUB_HEAD_REF;
  }
  if (targetBranch !== '') {
    // We want to override the branch that we are pulling / pushing to
    currentBranch = targetBranch;
  }
  logInfo('current branch:', currentBranch);
  logInfo('Current version:', currentVersion, '/', 'version:', version);

  //Bump version
  const rawNewVersion = bumpVersion(currentVersion, bumpMajorVersion, bumpMinorVersion, bumpPatchVersion);
  const completeNewVersion = `${tagPrefix}${rawNewVersion}`;
  
  return completeNewVersion;
}
