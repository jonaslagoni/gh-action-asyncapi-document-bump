const { execSync } = require('child_process');
const {
  getAsyncAPIDocument,
  exitSuccess,
  exitFailure,
  logError,
  runInWorkspace,
  bump,
  getGitCommits,
  findPreReleaseId,
  analyseVersionChange
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
  commitMessageToUse) => {
  await setGitConfigs();
  pathToDocument = pathToDocument !== '' ? pathToDocument : path.join(workspace, 'asyncapi.json');
  const document = getAsyncAPIDocument(pathToDocument);
  const currentVersion = document.info.version.toString();

  let version = defaultBumpVersion;
  let preReleaseId = preReleaseId;

  const commitMessages = getGitCommits();

  const commitMessageRegex = new RegExp(commitMessageToUse.replace(/{{version}}/g, `${tagPrefix}\\d+\\.\\d+\\.\\d+`), 'ig');
  const alreadyBumped = commitMessages.find((message) => commitMessageRegex.test(message)) !== undefined;

  if (alreadyBumped) {
    exitSuccess('No action necessary because we found a previous bump!');
    return false;
  }

  const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion} = analyseVersionChange(majorWording, minorWording, patchWording, rcWording, commitMessages);

  // case: if default=prerelease,
  // rc-wording is also set
  // and does not include any of rc-wording
  // then unset it and do not run
  if (
    doPreReleaseVersion &&
    preReleaseWords &&
    !commitMessages.some((message) => preReleaseWords.some((word) => message.includes(word)))
  ) {
    logInfo('Default bump version sat to a nonexisting prerelease wording, skipping bump. Please add ');
    return false;
  }

  //Should we do any version updates? 
  if (!doMajorVersion && !doMinorVersion && !doPatchVersion && !doPreReleaseVersion) {
    logInfo('Could not find any version bump to make, skipping.');
    return false;
  }
  
  // case: if prerelease id not explicitly set, use the found prerelease id in commit messages
  if (doPreReleaseVersion && !preReleaseId) {
    preReleaseId = findPreReleaseId(preReleaseWords, commitMessages);
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
  logInfo('Current branch:', currentBranch);
  logInfo('Current version:', currentVersion, '/', 'version:', version);

  //Bump version
  const newVersion = bumpVersion(currentVersion, doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion, preReleaseId, pathToDocument);
  await commitChanges(newVersion, skipCommit, skipTag, skipPush, commitMessageToUse);
  return true;
}
