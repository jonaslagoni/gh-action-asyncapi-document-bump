const { spawn } = require('child_process');
const { existsSync, promises } = require('fs');
const { EOL, version } = require('os');
const path = require('path');
const semverInc = require('semver/functions/inc');

module.exports.getAsyncAPIDocument = function getAsyncAPIDocument(pathToDocument) {
  if (!existsSync(pathToDocument)) throw new Error(`AsyncAPI document could not be found at ${pathToDocument}`);
  return require(pathToDocument);
}

module.exports.logInfo = function logInfo(message) {
  console.info(message);
}
module.exports.exitSuccess = function exitSuccess(message) {
  logInfo(`✔  success   ${message}`);
  process.exit(0);
}

module.exports.exitFailure = function exitFailure(message) {
  logError(message);
  process.exit(1);
}

module.exports.logError = function logError(error) {
  console.error(`✖  fatal     ${error.stack || error}`);
}

module.exports.writeNewVersion = async (newVersion, pathToDocument, asyncapiDocument) => {
  if (!existsSync(pathToDocument)) throw new Error(`AsyncAPI document could not be found at ${pathToDocument}`);
  asyncapiDocument.info.version = newVersion;
  await promises.writeFile(pathToDocument, JSON.stringify(asyncapiDocument, null, 4));
}

module.exports.runInWorkspace = function runInWorkspace(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: workspace });
    let isDone = false;
    const errorMessages = [];
    child.on('error', (error) => {
      if (!isDone) {
        isDone = true;
        reject(error);
      }
    });
    child.stderr.on('data', (chunk) => errorMessages.push(chunk));
    child.on('exit', (code) => {
      if (!isDone) {
        if (code === 0) {
          resolve();
        } else {
          reject(`${errorMessages.join('')}${EOL}${command} exited with code ${code}`);
        }
      }
    });
  });
}

/**
 * Bump the version and return the new version to use.
 * @param {*} currentVersion raw version number 'x.x.x'
 * @param {*} bumpMajorVersion 
 * @param {*} bumpMinorVersion 
 * @param {*} bumpPatchVersion 
 * @returns new version
 */
module.exports.bumpVersion = (currentVersion, bumpMajorVersion, bumpMinorVersion, bumpPatchVersion, bumpPreReleaseVersion, preReleaseId) => {
  let release;
  if(bumpPreReleaseVersion) {
    release = 'prerelease';
  } else if(bumpMajorVersion) {
    release = 'major';
  } else if(bumpMinorVersion) {
    release = 'minor';
  } else if(bumpPatchVersion) {
    release = 'patch';
  }
  return semverInc(currentVersion, release, {}, preReleaseId);
}

module.exports.getGitCommits = () => {
  const event = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};
  
  if (!event.commits) {
    logInfo("Couldn't find any commits in this event, incrementing patch version...");
  }
  return event.commits ? event.commits.map((commit) => commit.message + '\n' + commit.body) : [];
}


/**
 * Figure out which version change to do.
 */
module.exports.analyseVersionChange = (majorWording, minorWording, patchWording, rcWording, commitMessages) => {

  // input wordings for MAJOR, MINOR, PATCH, PRE-RELEASE
  const majorWords = majorWording.split(',');
  const minorWords = minorWording.split(',');
  // patch is by default empty, and '' would always be true in the includes(''), thats why we handle it separately
  const patchWords = patchWording ? patchWording.split(',') : null;
  const preReleaseWords = rcWording ? rcWording.split(',') : null;
  module.exports.logInfo('config words:', { majorWords, minorWords, patchWords, preReleaseWords });

  let doMajorVersion = false;
  let doMinorVersion = false;
  let doPatchVersion = false;
  let doPreReleaseVersion = false;
  // case: if wording for MAJOR found
  if (
    commitMessages.some(
      (message) => /^([a-zA-Z]+)(\(.+\))?(\!)\:/.test(message) || majorWords.some((word) => message.includes(word)),
    )
  ) {
    doMajorVersion = true;
  }
  // case: if wording for MINOR found
  else if (commitMessages.some((message) => minorWords.some((word) => message.includes(word)))) {
    doMinorVersion = true;
  }
  // case: if wording for PATCH found
  else if (patchWords && 
    commitMessages.some((message) => patchWords.some((word) => message.includes(word)))) {
    doPatchVersion = true;
  }
  // case: if wording for PRE-RELEASE found
  else if (
    preReleaseWords &&
    commitMessages.some((message) => preReleaseWords.some((word) => message.includes(word)))
  ) {
    doPreReleaseVersion = true;
  }
  return {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion}
}

module.exports.findPreReleaseId = (preReleaseWords, commitMessages) => {
  let foundWord = undefined;
  for (const commitMessage of commitMessages) {
    for (const preReleaseWord of preReleaseWords) {
      if (commitMessage.includes(preReleaseWord)) {
        foundWord = preReleaseWord.split('-')[1];
      }
    }
  }
  return foundWord;
}

module.exports.setGitConfigs = async () => {
  // set git user
  await runInWorkspace('git', ['config', 'user.name', `"${process.env.GITHUB_USER || 'Automated Version Bump'}"`]);
  await runInWorkspace('git', [
    'config',
    'user.email',
    `"${process.env.GITHUB_EMAIL || 'gh-action-asyncapi-bump-version@users.noreply.github.com'}"`,
  ]);

  await runInWorkspace('git', ['fetch']);
}

module.exports.commitChanges = async (newVersion, skipCommit, skipTag, skipPush, commitMessageToUse) => {
  try {
    // to support "actions/checkout@v1"
    if (!skipCommit) {
      await runInWorkspace('git', ['commit', '-a', '-m', commitMessageToUse.replace(/{{version}}/g, newVersion)]);
    }
  } catch (e) {
    console.warn(
      'git commit failed because you are using "actions/checkout@v2"; ' +
      'but that does not matter because you dont need that git commit, thats only for "actions/checkout@v1"',
    );
  }

  const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
  if (!skipTag) {
    await runInWorkspace('git', ['tag', newVersion]);
    if (!skipPush) {
      await runInWorkspace('git', ['push', remoteRepo, '--follow-tags']);
      await runInWorkspace('git', ['push', remoteRepo, '--tags']);
    }
  } else {
    if (!skipPush) {
      await runInWorkspace('git', ['push', remoteRepo]);
    }
  }
}