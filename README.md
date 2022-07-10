[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![Npm latest version](https://img.shields.io/npm/v/@lagoni/gh-action-asyncapi-document-bump)](https://www.npmjs.com/package/@jonaslagoni/gh-action-asyncapi-document-bump)
[![License](https://img.shields.io/github/license/jonaslagoni/gh-action-asyncapi-document-bump)](https://github.com/jonaslagoni/gh-action-asyncapi-document-bump/blob/master/LICENSE)
[![last commit](https://img.shields.io/github/last-commit/jonaslagoni/gh-action-asyncapi-document-bump)](https://github.com/jonaslagoni/gh-action-asyncapi-document-bump/commits/master)

### GitHub action used to bump the AsyncAPI document version in similar fashion to [semantic-release](https://github.com/semantic-release). It analyses the commit messages to figure out how to appropriately bump the AsyncAPI document version while following semver.

https://user-images.githubusercontent.com/13396189/178147591-3858bba5-2848-4cb3-b5d3-3e1bf39bc4e4.mp4


---

<!-- toc is generated with GitHub Actions do not remove toc markers -->

<!-- toc -->

- [Usage](#usage)
  - [Automated push to main](#automated-push-to-main)
  - [Through PR's](#through-prs)
- [Outputs](#outputs)
    - [**wasBumped**](#wasbumped)
    - [**oldVersion**](#oldversion)
    - [**newVersion**](#newversion)
- [Customization](#customization)
- [Restrictions](#restrictions)

<!-- tocstop -->

## Usage
You can use this action in different scenarios, below is a few use-cases.

### Automated push to main
For each commit on the `main` branch, try make a bump release for service X. If there is any version
```yaml
name: Bump AsyncAPI for X
on:
  push:
    branches:
      - main
jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2
      - name: Automated Version Bump
        uses: jonaslagoni/gh-action-asyncapi-document-bump@main
        env:
          GITHUB_TOKEN: '${{ secrets.GH_TOKEN }}'
        with:
          path-to-asyncapi: ./x_asyncapi.json
          commit-message: 'chore(release): x-service v{{version}}'
          commit-release-commit-message-regex: 'chore\(release\): x-service v{{version}}'
```
### Through PR's

For each commit on the `main` branch, check if we need to do a bump through a PR.

```yaml
name: Bump AsyncAPI for X
on:
  push:
    branches:
      - main
jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2
      - name: Automated Version Bump
        id: version_bump
        uses: jonaslagoni/gh-action-asyncapi-document-bump@main
        env:
          GITHUB_TOKEN: '${{ secrets.GH_TOKEN }}'
        with:
          path-to-asyncapi: ./x_asyncapi.json
          skip-tag: 'true'
          skip-commit: 'true'
          # Match commit message from PR creation, to know what commit are bump release. Match `commit-message` from PR creation.
          commit-release-commit-message-regex: 'chore\(release\): x-service v{{version}}'
      - if: steps.version_bump.outputs.wasBumped == 'true'
        name: Create Pull Request with bumped version
        uses: peter-evans/create-pull-request@v3
        with:
          token: '${{ secrets.GH_TOKEN }}'
          commit-message: 'chore(release): x-service v${{steps.version_bump.outputs.newVersion}}'
          committer: 'bot <bot@bot.com>'
          author: 'bot <bot@bot.com>'
          title: 'chore(release): x-service v${{steps.version_bump.outputs.newVersion}}'
          body: Version bump x-service
          branch: 'version-bump/v${{steps.version_bump.outputs.newVersion}}'
```

## Outputs
The GitHub action support different outputs that can be used in other jobs to control or modify workflows.

#### **wasBumped**
Makes it possible to run conditional extra jobs depending on whether the AsyncAPI document version was bumped or not.
```yaml
    - name: 'Automated Version Bump'
      id: version_bump
      uses: 'jonaslagoni/gh-action-asyncapi-document-bump@main'
      env:
        GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
    - if: steps.version_bump.outputs.wasBumped == 'true'
      name: This job is only run if the AsyncAPI document was bumped.
```

#### **oldVersion**
Access the old version of the AsyncAPI document before the version was bumped.
```yaml
    - name: 'Automated Version Bump'
      id: version_bump
      uses: 'jonaslagoni/gh-action-asyncapi-document-bump@main'
      env:
        GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
    - if: steps.version_bump.outputs.wasBumped == 'true'
      name: Print the old version of the document
      run: |
        echo ${{steps.version_bump.outputs.oldVersion}}
```
#### **newVersion**
Access the new version of the AsyncAPI document after the version was bumped.
```yaml
    - name: 'Automated Version Bump'
      id: version_bump
      uses: 'jonaslagoni/gh-action-asyncapi-document-bump@main'
      env:
        GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
    - if: steps.version_bump.outputs.wasBumped == 'true'
      name: Print the new version of the document
      run: |
        echo ${{steps.version_bump.outputs.newVersion}}
```

## Customization

| input | description | type | default | 
|---|---|---|---|
| minor-wording | Used to match wordings for commit messages that will trigger a minor version change. Use ',' to separate multiple values. | string | 'feat' |
| patch-wording | Used to match wordings for commit messages that will trigger a patch version change. Use ',' to separate multiple values. | string | 'fix' |
| major-wording | Used to match wordings for commit messages that will trigger a major version change. Use ',' to separate multiple values. | string | 'feat!,fix!,refactor!' |
| release-candidate-wording | Used to match wordings for commit messages that will trigger a RC version change. Use ',' to separate multiple values. | string | 'next' |
| tag-prefix | Prefix that is used for the git tag | string | '' |
| skip-tag | Skip tagging the commit | boolean | 'true' |
| skip-commit | No commit is made after the version is bumped. Must be used in combination with `skip-tag`, since if there's no commit, there's nothing to tag. | boolean | 'true' |
| skip-push | If true, skip pushing any commits or tags created after the version bump. | boolean | 'true' |
| dry-run | This makes sure that no changes are made to the AsyncAPI document and no changes are committed. Use this to determine if any bumps is necessary. Cannot be used in combination with the other `skip-` inputs. | boolean | 'false' |
| path-to-asyncapi | Set a custom path to the asyncapi document. Useful in cases such as updating the version on main after a tag has been set. The path is resolved based on the path to the root of the repository. | string | './asyncapi.json' |
| target-branch | Set a custom target branch to use when bumping the version. Useful in cases such as updating the version on main after a tag has been set. | string | '' |
| pre-release-id | Set a custom pre-release id. | string | 'next' |
| commit-message | Set a custom commit message for version bump commit. Useful for skipping additional workflows run on push. Use {{version}} as a placeholder for the new version. | string | 'ci: version bump to {{version}}' |
| release-commit-message-regex | Set the regex to match release commit messages so the action knows which commit messages to use and which to ignore. Usually it is similar or the same as `commit-message`. Use {{version}} as a placeholder for the new version. Defaults to commit-message input. | string | 

## Restrictions

These are the current restrictions:
- Only support **JSON** format for the AsyncAPI document and not **YAML**.
- Cannot be triggered by nested references, as we only look for references in the AsyncAPI document.
