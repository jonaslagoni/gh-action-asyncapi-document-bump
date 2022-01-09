const path = require('path');
const core = require('@actions/core');
const {
  getAsyncAPIDocument,
  getCommitMessages,
  findPreReleaseId,
  analyseVersionChange,
  bumpVersion,
  commitChanges,
  logInfo,
  setGitConfigs,
  writeNewVersion,
  collectReferences,
  getRelevantCommitMessages,
  exitSuccess
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
  commitMessageToUse,
  dryRun) => {
  // eslint-disable-next-line security/detect-non-literal-require
  const gitEvents = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};
  logInfo(`Found the following git events: ${JSON.stringify(gitEvents, null, 4)}`);
  const workspace = process.env.GITHUB_WORKSPACE;
  const token = process.env.GITHUB_TOKEN;
  await setGitConfigs();
  pathToDocument = path.join(workspace, pathToDocument);
  const document = getAsyncAPIDocument(pathToDocument);
  const referencedFiles = collectReferences(document, pathToDocument);
  logInfo(`Found referenced files: ${JSON.stringify(referencedFiles, null, 4)}`);
  const currentVersion = document.info.version.toString();
  core.setOutput('oldVersion', currentVersion);
  logInfo(`Current version of AsyncAPI document: ${currentVersion}`);

  const commitMessages = await getCommitMessages([pathToDocument, ...referencedFiles], gitEvents, token, workspace);
  logInfo(`Found commit messages: ${JSON.stringify(commitMessages, null, 4)}`);

  const relevantCommitMessages = getRelevantCommitMessages(commitMessages, commitMessageToUse, tagPrefix);
  logInfo(`Relevant commit messages: ${JSON.stringify(relevantCommitMessages, null, 4)}`);
  if (relevantCommitMessages.length === 0) {
    exitSuccess('No action necessary because latest commit was a bump!');
    return false;
  }

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
  logInfo(`Current branch: ${currentBranch}`);

  //Bump version
  const newVersion = bumpVersion(currentVersion, doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion, preReleaseId);
  core.setOutput('newVersion', `${newVersion}`);
  logInfo(`New version for AsyncAPI document: ${newVersion}`);
  if (dryRun === false) {
    await writeNewVersion(newVersion, pathToDocument, document);
    await commitChanges(newVersion, skipCommit, skipTag, skipPush, commitMessageToUse);
  }
  return true;
};
