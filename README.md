> NOTICE: This library is at it's core forked from [GH action bump npm version](https://github.com/phips28/gh-action-bump-version).

# AsyncAPI sematic release 
GitHub action used to bump the AsyncAPI document version in similar fashion to [semantic-release](https://github.com/semantic-release). 

It analyses the commit messages to figure out how to appropriately bump the AsyncAPI document version while following semver.

**Attention**

- Make sure you use the `actions/checkout@v2` action before this, otherwise the GH action do not have access to the AsyncAPI document!
- Currently only **JSON** format are supported and not **YAML**.

## Outputs
The GitHub action support different outputs that can be used in other jobs to control or modify workflows.
#### **wasBumped:**
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

#### **oldVersion:**
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
#### **newVersion:**
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

### Customization

#### **wording:** 
Customize the messages that triggers which version bump. It must be a string, case sensitive and comma separated (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    minor-wording:  'add,Adds,new'
    major-wording:  'MAJOR,cut-major'
    patch-wording:  'patch,fixes'     # Providing patch-wording will override commits
                                      # defaulting to a patch bump.
    release-candidate-wording:     'RELEASE,alpha'
```

#### **pre-id:**
Set a pre-id value will building prerelease version  (optional - defaults to 'rc'). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
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
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag-prefix:  'v'
```

#### **skip-tag:**
The tag is not added to the git repository  (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    skip-tag:  'true'
```

#### **skip-commit:**
No commit is made after the version is bumped (optional). Must be used in combination with `skip-tag`, since if there's no commit, there's nothing to tag. Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
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
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    skip-push:  'true'
```

#### **path-to-asyncapi:**
Set a custom path to the asyncapi document. Useful in cases such as updating the version on main after a tag has been set (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    path-to-asyncapi: './asyncapi.json'
```

#### **target-branch:**
Set a custom target branch to use when bumping the version. Useful in cases such as updating the version on main after a tag has been set (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    target-branch: 'main'
```
#### **pre-release-id:**
Set a custom pre-release id. Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    pre-release-id: 'next'
```

#### **commit-message:**
Set a custom commit message for version bump commit. Useful for skipping additional workflows run on push. Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    commit-message: 'CI: bumps version to {{version}} [skip ci]'
```

#### **dry-run:**
This makes sure that no changes are made to the AsyncAPI document and no changes are committed. Use this to determine if any bumps is necessary (optional). Example:
```yaml
- name:  'Automated Version Bump'
  uses:  'jonaslagoni/gh-action-asyncapi-document-bump@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    dry-run:  'true'
```
