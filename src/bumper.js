const path = require('path');
const {
  getAsyncAPIDocument,
  exitSuccess,
  getRelatedGitCommits,
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

  const commitMessages = getRelatedGitCommits([pathToDocument, ...referencedFiles], gitEvents, token, workspace);

  // eslint-disable-next-line security/detect-non-literal-regexp
  const commitMessageRegex = new RegExp(commitMessageToUse.replace(/{{version}}/g, `${tagPrefix}\\d+\\.\\d+\\.\\d+`), 'ig');
  const latestCommitIsBump = commitMessageRegex.test(commitMessages[0]);

  if (latestCommitIsBump) {
    exitSuccess('No action necessary because latest commit was a bump!');
    return false;
  }

  const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion} = analyseVersionChange(majorWording, minorWording, patchWording, rcWording, commitMessages);

  //Should we do any version updates? 
  if (!doMajorVersion && !doMinorVersion && !doPatchVersion && !doPreReleaseVersion) {
    logInfo('Could not find any version bump to make, skipping.');
    return false;
  }
  
  // case: if prerelease id not explicitly set, use the found prerelease id in commit messages
  if (doPreReleaseVersion && !preReleaseId) {
    preReleaseId = findPreReleaseId(rcWording, commitMessages);
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
