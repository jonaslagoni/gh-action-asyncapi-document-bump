const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { EOL } = require('os');
const path = require('path');

module.exports.getAsyncAPIDocument = function getAsyncAPIDocument(pathToDocument) {
  pathToDocument = pathToDocument !== '' ? pathToDocument : path.join(workspace, 'asyncapi.json');
  if (!existsSync(pathToDocument)) throw new Error("asyncapi.json could not be found in your project's root.");
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
 * @returns 
 */
module.exports.bumpVersion = (currentVersion, bumpMajorVersion, bumpMinorVersion, bumpPatchVersion) => {
  return currentVersion;
}

module.exports.getGitCommits = () => {
  const event = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};

  if (!event.commits) {
    logInfo("Couldn't find any commits in this event, incrementing patch version...");
  }
  return event.commits ? event.commits.map((commit) => commit.message + '\n' + commit.body) : [];
}

module.exports.shouldDoBump = (commitMessages) => {
  const commitMessageRegex = new RegExp(commitMessage.replace(/{{version}}/g, `${tagPrefix}\\d+\\.\\d+\\.\\d+`), 'ig');
  const isVersionBump = commitMessages.find((message) => commitMessageRegex.test(message)) !== undefined;

  if (isVersionBump) {
    exitSuccess('No action necessary because we found a previous bump!');
    return false;
  }

  // case: if default=prerelease,
  // rc-wording is also set
  // and does not include any of rc-wording
  // then unset it and do not run
  if (
    version === 'prerelease' &&
    preReleaseWords &&
    !commitMessages.some((message) => preReleaseWords.some((word) => message.includes(word)))
  ) {
    logInfo('Default bump version sat to a nonexisting release candidate wording, skipping bump.');
    return;
  }
  return true;
}

/**
 * Figure out which version change to do.
 */
module.exports.analyseVersionChange = (commitMessages) => {

  // input wordings for MAJOR, MINOR, PATCH, PRE-RELEASE
  const majorWords = majorWording.split(',');
  const minorWords = minorWording.split(',');
  // patch is by default empty, and '' would always be true in the includes(''), thats why we handle it separately
  const patchWords = patchWording ? patchWording.split(',') : null;
  const preReleaseWords = rcWording ? rcWording.split(',') : null;
  logInfo('config words:', { majorWords, minorWords, patchWords, preReleaseWords });

  const doMajorVersion = false;
  const doMinorVersion = false;
  const doPatchVersion = false;
  if (
    commitMessages.some(
      (message) => /^([a-zA-Z]+)(\(.+\))?(\!)\:/.test(message) || majorWords.some((word) => message.includes(word)),
    )
  ) {
    version = 'major';
    doMajorVersion = true;
  }
  // case: if wording for MINOR found
  else if (commitMessages.some((message) => minorWords.some((word) => message.includes(word)))) {
    version = 'minor';
    doMinorVersion = true;
  }
  // case: if wording for PATCH found
  else if (patchWords && commitMessages.some((message) => patchWords.some((word) => message.includes(word)))) {
    version = 'patch';
    doPatchVersion = true;
  }
  // case: if wording for PRE-RELEASE found
  else if (
    preReleaseWords &&
    commitMessages.some((message) =>
      preReleaseWords.some((word) => {
        if (message.includes(word)) {
          foundWord = word;
          return true;
        } else {
          return false;
        }
      }),
    )
  ) {
    preId = foundWord.split('-')[1];
    version = 'prerelease';
  }
  return {doMajorVersion, doMinorVersion, doPatchVersion}
}

module.exports.commitChanges = () => {
  // set git user
  await runInWorkspace('git', ['config', 'user.name', `"${process.env.GITHUB_USER || 'Automated Version Bump'}"`]);
  await runInWorkspace('git', [
    'config',
    'user.email',
    `"${process.env.GITHUB_EMAIL || 'gh-action-bump-version@users.noreply.github.com'}"`,
  ]);


  // now go to the actual branch to perform the same versioning
  if (isPullRequest) {
    // First fetch to get updated local version of branch
    await runInWorkspace('git', ['fetch']);
  }

  try {
    // to support "actions/checkout@v1"
    if (!skipCommit) {
      await runInWorkspace('git', ['commit', '-a', '-m', commitMessage.replace(/{{version}}/g, newVersion)]);
    }
  } catch (e) {
    console.warn(
      'git commit failed because you are using "actions/checkout@v2"; ' +
      'but that doesnt matter because you dont need that git commit, thats only for "actions/checkout@v1"',
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