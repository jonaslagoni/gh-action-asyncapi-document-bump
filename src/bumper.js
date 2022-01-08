const path = require('path');
const {
  getAsyncAPIDocument,
  exitSuccess,
  getCommitMessages,
  findPreReleaseId,
  analyseVersionChange,
  bumpVersion,
  commitChanges,
  logInfo,
  setGitConfigs,
  writeNewVersion,
  collectReferences
} = require('./utils');

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
  preReleaseId,
  commitMessageToUse) => {
  // eslint-disable-next-line security/detect-non-literal-require
  const gitEvents = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};
  logInfo(`Found the following git events: ${JSON.stringify(gitEvents, null, 4)}`);
  const workspace = process.env.GITHUB_WORKSPACE;
  const token = process.env.GITHUB_TOKEN;
  await setGitConfigs();
  pathToDocument = path.join(workspace, pathToDocument);
  const document = getAsyncAPIDocument(pathToDocument);
  const referencedFiles = collectReferences(document, pathToDocument);
  const currentVersion = document.info.version.toString();

  const commitMessages = getCommitMessages([pathToDocument, ...referencedFiles], gitEvents, token, workspace);
  logInfo('Found commit messages: ', commitMessages);

  // eslint-disable-next-line security/detect-non-literal-regexp
  const commitMessageRegex = new RegExp(commitMessageToUse.replace(/{{version}}/g, `${tagPrefix}\\d+\\.\\d+\\.\\d+`), 'ig');
  let commitIndexOfBump = undefined;
  // Find the latest commit that matches release commit message
  for (const [index, commitMessage] of commitMessages.entries()) {
    const commitIsBump = commitMessageRegex.test(commitMessage);
    if (commitIsBump) {
      commitIndexOfBump = index;
    }
  }

  if (commitIndexOfBump === 1) {
    exitSuccess('No action necessary because latest commit was a bump!');
    return;
  }

  // Splice the commit messages to only contain those who are after bump commit
  const relevantCommitMessages = commitMessages.slice(0, commitIndexOfBump-1);
  logInfo('Relevant commit messages: ', relevantCommitMessages);

  const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion} = analyseVersionChange(majorWording, minorWording, patchWording, rcWording, relevantCommitMessages);

  //Should we do any version updates? 
  if (!doMajorVersion && !doMinorVersion && !doPatchVersion && !doPreReleaseVersion) {
    logInfo('Could not find any version bump to make, skipping.');
    return false;
  }
  
  // case: if prerelease id not explicitly set, use the found prerelease id in commit messages
  if (doPreReleaseVersion && !preReleaseId) {
    preReleaseId = findPreReleaseId(rcWording, relevantCommitMessages);
  }

  // eslint-disable-next-line security/detect-child-process
  let currentBranch = (/refs\/[a-zA-Z]+\/(.*)/).exec(process.env.GITHUB_REF)[1];
  if (process.env.GITHUB_HEAD_REF) {
    // Comes from a pull request
    currentBranch = process.env.GITHUB_HEAD_REF;
  }
  if (targetBranch !== '') {
    // We want to override the branch that we are pulling / pushing to
    currentBranch = targetBranch;
  }
  logInfo('Current branch:', currentBranch);
  logInfo('Current version:', currentVersion);

  //Bump version
  const newVersion = bumpVersion(currentVersion, doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion, preReleaseId);
  await writeNewVersion(newVersion, pathToDocument);
  await commitChanges(newVersion, skipCommit, skipTag, skipPush, commitMessageToUse);
  return true;
};
