const { logInfo, logError, bumpVersion, analyseVersionChange, collectReferences, getRelevantCommitMessages } = require('../src/utils');
const path = require('path');
describe('Utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('collectReferences', () => {
    test('should collect correct references', () => {
      const obj = {
        test: {
          $ref: './1.json',
          test: {
            $ref: './2.json'
          }
        },
        test2: {
          $ref: './3.json'
        },
        test2Fragment: {
          $ref: './3.json#test'
        }
      };
      const rootPath = '/test/';
      const asyncapiFilePath = `${rootPath}asyncapi.json`;
      const list = collectReferences(obj, asyncapiFilePath);
      const expectedList = [path.resolve(rootPath, '1.json'), path.resolve(rootPath, '2.json'), path.resolve(rootPath, '3.json')];
      expect(list).toEqual(expectedList);
    });
  });
  describe('getRelevantCommitMessages', () => {
    test('should return relevant commit messages up until release commit', () => {
      const messages = [
        'feat: new test something description\n',
        'ci: fixed commit message not matched\n',
        'chore(release): test something v0.3.0 (#6)\n',
        'feat: new test something description\n'
      ];
      const relevantCommitMessages = getRelevantCommitMessages(messages, 'chore\\(release\\): test something v{{version}}', '');
      expect(relevantCommitMessages).toEqual([
        'feat: new test something description\n',
        'ci: fixed commit message not matched\n'
      ]);
    });
    test('should return no commits if release is the latest commit', () => {
      const messages = [
        'chore(release): test something v0.3.0 (#6)\n',
        'feat: new test something description\n'
      ];
      const relevantCommitMessages = getRelevantCommitMessages(messages, 'chore\\(release\\): test something v{{version}}', '');
      expect(relevantCommitMessages).toEqual([]);
    });
  });
  describe('logInfo', () => {
    test('should log correct message', () => {
      const spy = jest.spyOn(global.console, 'info').mockImplementation(() => { return; });
      const message = 'message';
      logInfo(message);
      expect(spy).toHaveBeenNthCalledWith(1, message);
    });
  });
  describe('logError', () => {
    test('should log correct message', () => {
      const spy = jest.spyOn(global.console, 'error').mockImplementation(() => { return; });
      const message = 'message';
      logError(message);
      expect(spy).toHaveBeenNthCalledWith(1, `✖  fatal     ${message}`);
    });
  });
  describe('bumpVersion', () => {
    test('should bump major version', () => {
      const newVersion = bumpVersion('0.0.0', true, false, false, false, undefined);
      expect(newVersion).toEqual('1.0.0');
    });
    test('should bump minor version', () => {
      const newVersion = bumpVersion('0.0.0', false, true, false, false, undefined);
      expect(newVersion).toEqual('0.1.0');
    });
    test('should bump fix version', () => {
      const newVersion = bumpVersion('0.0.0', false, false, true, false, undefined);
      expect(newVersion).toEqual('0.0.1');
    });
    test('should bump prerelease version', () => {
      const newVersion = bumpVersion('0.0.0', false, false, false, true, 'pre');
      expect(newVersion).toEqual('0.0.1-pre.0');
    });
    test('should bump existing prerelease version', () => {
      const newVersion = bumpVersion('0.0.1-pre.0', false, false, false, true, 'pre');
      expect(newVersion).toEqual('0.0.1-pre.1');
    });
    test('should bump existing prerelease version to new prerelease id', () => {
      const newVersion = bumpVersion('0.0.1-pre.0', false, false, false, true, 'pre2');
      expect(newVersion).toEqual('0.0.1-pre2.0');
    });
  });
  describe('analyseVersionChange', () => {
    test('figure out to bump major version', () => {
      const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion} = analyseVersionChange('feat!', '', '', '', ['feat!: change request']);
      expect(doMajorVersion).toEqual(true);
      expect(doMinorVersion).toEqual(false);
      expect(doPatchVersion).toEqual(false);
      expect(doPreReleaseVersion).toEqual(false);
    });
    test('figure out to bump minor version', () => {
      const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion} = analyseVersionChange('feat!', 'feat', '', '', ['feat: change request']);
      expect(doMajorVersion).toEqual(false);
      expect(doMinorVersion).toEqual(true);
      expect(doPatchVersion).toEqual(false);
      expect(doPreReleaseVersion).toEqual(false);
    });
    test('figure out to bump patch version', () => {
      const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion} = analyseVersionChange('feat!', 'feat', 'fix', '', ['fix: change request']);
      expect(doMajorVersion).toEqual(false);
      expect(doMinorVersion).toEqual(false);
      expect(doPatchVersion).toEqual(true);
      expect(doPreReleaseVersion).toEqual(false);
    });
    test('figure out to bump pre-release version', () => {
      const {doMajorVersion, doMinorVersion, doPatchVersion, doPreReleaseVersion} = analyseVersionChange('feat!', 'feat', 'fix', 'pre', ['pre: change request']);
      expect(doMajorVersion).toEqual(false);
      expect(doMinorVersion).toEqual(false);
      expect(doPatchVersion).toEqual(false);
      expect(doPreReleaseVersion).toEqual(true);
    });
  });
});