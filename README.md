# Swapi Test

TODO: Fill in the desired project description here

## View Components (Storybook)

To view storybook, simply run:

```sh
npm run storybook
```

## View application/integration server

```sh
npm run dev
```

## Visit Repo PR page

Takes you to this projects PR's in it's remote repo. This is where features and
changes for a branch should be requested to be merged in. PR's should be made
exclusively to the `dev` branch unless you are making a release.

```sh
npm run pr
```

## Using the UI components in your own project

You can install this project like any repository using npm by installing the
repo from a git repo style install:

```sh
npm i -DE <company name>/<repo name>
```

Then if your project settings are properly established, you use the components
like so:

```javascript
import { ComponentName } from "swapi-test";
```

### FONTS

This project should also include the used fonts to make it work. Ensure these
fonts are embedded on the page you are working with. They will be found under
`ui/assets` within the project's repo if you need them.

## Developing for this project

Same as viewing the project. Simply run:

```sh
npm i
```

IF THAT FAILS RUN INSTEAD

```sh
npm i --legacy-peer-deps
```

then for UI component development:

```sh
npm run storybook
```

Or for Integration or Web App development:

```sh
npm run dev
```

Then your changes in the source code will automatically be reflected in the
project.

## Building a new distribution of the project

After changes are completed and ready for a new distribution. Simply run:

```sh
npm run release
```

The new files will be generated and will generate a release branch. If the
branch is created SUCCESSFULLY (ensure no errors occurred in the process), the
process should push the branch and the newly created tag to the repo for you.

Thus you should now be able to create a PR from `release` to `master` and `dev`.

Some shortcut commands were created to help this process, you can either go to
the PR page and generate the PRs:

```sh
npm run pr
```

Or you can try using the auto PR set up to open up both PR creation request
pages automatically:

```sh
npm run pr-release
```

These are just convenience methods created and should not be an excuse to NOT
understand what is happening. Only an administrator of the project who
understands the implications should be running through the release procedure.

This script WILL NOT WORK correctly unless there are commits with the following
message formats:

feature: message
fixed: message
breaking: message
task: message

You can also make commits with NO semver indicator which will be ignored by the
notes generation and semver versioning.
