# gh-action-asyncapi-document-bump
GitHub action which bumps the AsyncAPI document version for following Semantic Versioning.

This Action bumps the version in asyncapi.json and pushes it back to the repo.
It is meant to be used on every successful merge to master but
you'll need to configured that workflow yourself. 

**Attention**

Make sure you use the `actions/checkout@v2` action!

**Migration: Version v9 and up**

Remove the 'actions/setup-node@v1' step from your action.yml file
```
      - name: 'Setup Node.js'
        uses: 'actions/setup-node@v1'
        with:
          node-version: 14
```

### Workflow

* Based on the commit messages, increment the version from the latest release.
  * If the string "BREAKING CHANGE", "major" or the Attention pattern `refactor!: drop support for Node 6` is found anywhere in any of the commit messages or descriptions the major
    version will be incremented.
  * If a commit message begins with the string "feat" or includes "minor" then the minor version will be increased. This works
    for most common commit metadata for feature additions: `"feat: new API"` and `"feature: new API"`.
  * If a commit message contains the word "pre-alpha" or "pre-beta" or "pre-rc" then the pre-release version will be increased (for example specifying pre-alpha: 1.6.0-alpha.1 -> 1.6.0-alpha.2 or, specifying pre-beta: 1.6.0-alpha.1 -> 1.6.0-beta.0)
  * All other changes will increment the patch version.
* Push the bumped version in asyncapi.json back into the repo.
* Push a tag for the new version back into the repo.

### Usage:


#### **wording:** 
Customize the messages that trigger the version bump. It must be a string, case sensitive, coma separated  (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    minor-wording:  'add,Adds,new'
    major-wording:  'MAJOR,cut-major'
    patch-wording:  'patch,fixes'     # Providing patch-wording will override commits
                                      # defaulting to a patch bump.
    rc-wording:     'RELEASE,alpha'
```
#### **default:**
Set a default version bump to use  (optional - defaults to patch). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    default: prerelease
```

#### **pre-id:**
Set a pre-id value will building prerelease version  (optional - defaults to 'rc'). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    default: prerelease
    pre-id: 'prc'
```

#### **tag-prefix:**
Prefix that is used for the git tag  (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag-prefix:  'v'
```

#### **skip-tag:**
The tag is not added to the git repository  (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    skip-tag:  'true'
```

#### **skip-commit:**
No commit is made after the version is bumped (optional). Must be used in combination with `skip-tag`, since if there's no commit, there's nothing to tag. Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    skip-commit:  'true'
    skip-tag: 'true'
```

#### **skip-push:**
If true, skip pushing any commits or tags created after the version bump (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    skip-push:  'true'
```

#### **TARGET-BRANCH:**
Set a custom target branch to use when bumping the version. Useful in cases such as updating the version on master after a tag has been set (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    target-branch: 'master'
```

#### **commit-message:**
Set a custom commit message for version bump commit. Useful for skipping additional workflows run on push. Example:
```yaml
- name:  'Automated Version Bump'
  uses:  '@lagoni/gh-action-asyncapi-document-bump@master'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    commit-message: 'CI: bumps version to {{version}} [skip ci]'
```
