// eslint-disable-next-line security/detect-child-process
const { spawn } = require('child_process');
const { existsSync, promises } = require('fs');
const { EOL } = require('os');
const semverInc = require('semver/functions/inc');
const path = require('path');

function getAsyncAPIDocument(pathToDocument) {
  if (!existsSync(pathToDocument)) throw new Error(`AsyncAPI document could not be found at ${pathToDocument}`);
  // eslint-disable-next-line security/detect-non-literal-require
  return require(pathToDocument);
}

function logInfo(message) {
  console.info(message);
}
function exitSuccess(message) {
  logInfo(`✔  success   ${message}`);
  process.exit(0);
}

function exitFailure(message) {
  logError(message);
  process.exit(1);
}

function logError(error) {
  console.error(`✖  fatal     ${error.stack || error}`);
}

async function writeNewVersion(newVersion, pathToDocument, asyncapiDocument) {
  if (!existsSync(pathToDocument)) throw new Error(`AsyncAPI document could not be found at ${pathToDocument}`);
  asyncapiDocument.info.version = newVersion;
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await promises.writeFile(pathToDocument, JSON.stringify(asyncapiDocument, null, 4));
}

function runInWorkspace(command, args) {
  const workspace = process.env.GITHUB_WORKSPACE;
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
function bumpVersion(currentVersion, bumpMajorVersion, bumpMinorVersion, bumpPatchVersion, bumpPreReleaseVersion, preReleaseId) {
  let release;
  if (bumpPreReleaseVersion) {
    release = 'prerelease';
  } else if (bumpMajorVersion) {
    release = 'major';
  } else if (bumpMinorVersion) {
    release = 'minor';
  } else if (bumpPatchVersion) {
    release = 'patch';
  }
  return semverInc(currentVersion, release, {}, preReleaseId);
}
function collectReferences(asyncapi) {
  const files = [];
  const localCollector = (obj) => {
    if (obj['$ref']) {
      files.push(obj['$ref']);
    }
    for (const o of Object.values(obj || {})) {
      if (typeof o === 'object') {
        localCollector(o);
      }
    }
  };
  localCollector(asyncapi);
  return files;
}
function getRelatedGitCommits(asyncapiFilePath, referencedFiles, gitEvents, workspacePath) {
  if (gitEvents.commits) {  
    //Filter out any commits that dont modify our AsyncAPI file or referenced files
    const commitMessages =  gitEvents.commits.filter((commit) => {
      const modifiedFiles = (commit.modified || []).map((modifiedFilePath) => {
        return path.resolve(workspacePath, modifiedFilePath);
      });
      logInfo(`Modified files for ${commit.message}: ${JSON.stringify(modifiedFiles, null, 4)}`);
      const asyncapiDocumentChanged = modifiedFiles.includes(path.resolve(asyncapiFilePath));
      for (const referencedFile of referencedFiles) {
        if (modifiedFiles.includes(path.resolve(referencedFile))) {
          return true;
        }
      }
      return asyncapiDocumentChanged;
    }).map((commit) => `${commit.message}\n${commit.body || ''}`);
    if (commitMessages.length === 0) {
      exitFailure('After filtering commits, none matched the AsyncAPI document or referenced files');
    }
    return commitMessages;
  } 
  exitFailure('Could not find any commits, existing');
}

/**
 * Figure out which version change to do.
 */
function analyseVersionChange(majorWording, minorWording, patchWording, rcWording, commitMessages) {
  // input wordings for MAJOR, MINOR, PATCH, PRE-RELEASE
  const majorWords = majorWording.split(',');
  const minorWords = minorWording.split(',');
  // patch is by default empty, and '' would always be true in the includes(''), thats why we handle it separately
  const patchWords = patchWording ? patchWording.split(',') : null;
  const preReleaseWords = rcWording ? rcWording.split(',') : null;
  logInfo(`config words: ${JSON.stringify({ majorWords, minorWords, patchWords, preReleaseWords })}`);

  let doMajorVersion = false;
  let doMinorVersion = false;
  let doPatchVersion = false;
  let doPreReleaseVersion = false;
  // case: if wording for MAJOR found
  if (
    commitMessages.some(
      // eslint-disable-next-line security/detect-unsafe-regex
      (message) => (/^([a-zA-Z]+)(\(.+\))?(\!)\:/).test(message) || majorWords.some((word) => message.includes(word)),
    )
  ) {
    doMajorVersion = true;
  } else if (commitMessages.some((message) => minorWords.some((word) => message.includes(word)))) {
    // case: if wording for MINOR found
    doMinorVersion = true;
  } else if (patchWords && 
    commitMessages.some((message) => patchWords.some((word) => message.includes(word)))) {
    // case: if wording for PATCH found
    doPatchVersion = true;
  } else if (
    preReleaseWords &&
    commitMessages.some((message) => preReleaseWords.some((word) => message.includes(word)))) {
    // case: if wording for PRE-RELEASE found
    doPreReleaseVersion = true;
  }
  return {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion};
}

function findPreReleaseId(preReleaseWords, commitMessages) {
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

async function setGitConfigs() {
  // set git user
  await runInWorkspace('git', ['config', 'user.name', `"${process.env.GITHUB_USER || 'Automated Version Bump'}"`]);
  await runInWorkspace('git', [
    'config',
    'user.email',
    `"${process.env.GITHUB_EMAIL || 'gh-action-asyncapi-bump-version@users.noreply.github.com'}"`,
  ]);

  await runInWorkspace('git', ['fetch']);
}

async function commitChanges(newVersion, skipCommit, skipTag, skipPush, commitMessageToUse) {
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
  } else if (!skipPush) {
    await runInWorkspace('git', ['push', remoteRepo]);
  }
}

module.exports = {
  getAsyncAPIDocument,
  logInfo,
  exitSuccess, 
  exitFailure,
  logError,
  writeNewVersion,
  runInWorkspace,
  bumpVersion,
  getRelatedGitCommits,
  analyseVersionChange,
  findPreReleaseId,
  setGitConfigs,
  commitChanges,
  collectReferences
};