# webnative SDK

[![NPM](https://img.shields.io/npm/v/webnative)](https://www.npmjs.com/package/webnative)
[![Build Status](https://travis-ci.org/fission-suite/webnative.svg?branch=master)](https://travis-ci.org/fission-suite/webnative)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/fission-suite/blob/master/LICENSE)
[![Maintainability](https://api.codeclimate.com/v1/badges/524fbe384bb6c312fa11/maintainability)](https://codeclimate.com/github/fission-suite/webnative/maintainability)
[![Built by FISSION](https://img.shields.io/badge/⌘-Built_by_FISSION-purple.svg)](https://fission.codes)
[![Discord](https://img.shields.io/discord/478735028319158273.svg)](https://discord.gg/zAQBDEq)
[![Discourse](https://img.shields.io/discourse/https/talk.fission.codes/topics)](https://talk.fission.codes)

Fission helps developers build and scale their apps. We’re building a web native file system that combines files, encryption, and identity, like an open source iCloud.

---

**[Read the Guide for extended documentation and getting started information »](https://guide.fission.codes/webnative-sdk/getting-started-webnative-sdk)**

---

## What you'll find here

The Fission webnative SDK offers tools for:
- authenticating through a Fission **authentication lobby**  
  (a lobby is where you can make a Fission account or link an account)
- managing your web native **file system**  
  (this is where a user's data lives)
- tools for building DIDs and UCANs.
- interacting with the users apps via the **platform APIs**

```ts
// ES6
import * as sdk from 'webnative'

// Browser/UMD build
self.webnative
```

See [`docs/`](docs/) for more detailed documentation based on the source code.



# Authentication

```ts
const { scenario, state } = await sdk.initialise()

if (scenario.authCancelled) {
  // User was redirected to lobby,
  // but cancelled the authorisation.

} else if (scenario.authSucceeded || scenario.continuum) {
  // State:
  // state.authenticated    -  Will always be `true` in these scenarios
  // state.newUser          -  If the user is new to Fission
  // state.throughLobby     -  If the user authenticated through the lobby, or just came back.
  // state.username         -  The user's username.
  //
  // ☞ We can now interact with our file system (more on that later)
  state.fs

} else if (scenario.notAuthenticated) {
  sdk.redirectToLobby()

}
```

`redirectToLobby` will redirect you to [auth.fission.codes](https://auth.fission.codes) our authentication lobby, where you'll be able to make a Fission an account and link with another account that's on another device or browser. The function takes an optional parameter, the url that the lobby should redirect back to (the default is `location.href`).


# Web Native File System

The Web Native File System (WNFS) is built on top of the InterPlanetary File System (IPFS). It's structured and functions similarly to a Unix-style file system, with one notable exception: it's a Directed Acyclic Graph (DAG), meaning that a given child can have more than one parent (think symlinks but without the "sym").

Each file system has a public tree and a private tree, much like your MacOS, Windows, or Linux desktop file system. The public tree is "live" and publically accessible on the Internet. The private tree is encrypted so that only the owner can see the contents.

All information (links, data, metadata, etc) in the private tree is encrypted. Decryption keys are stored in such a manner that access to a given folder grants access to all of its subfolders.

```ts
// After authenticating …
const fs = state.fs

// List the user's private files that belong to this app
const appPath = fs.appPath.private("myApp")

if (await fs.exists(appPath)) {
  await fs.ls(appPath)
} else {
  await fs.mkdir(appPath)
}
```


## Basics

WNFS exposes a familiar POSIX-style interface:
- `add`: add a file
- `cat`: retrieve a file
- `exists`: check if a file or directory exists
- `ls`: list a directory
- `mkdir`: create a directory
- `mv`: move a file or directory
- `read`: alias for `cat`
- `rm`: remove a file or directory
- `write`: write to a file


# Development

```
# install dependencies
yarn

# run development server
yarn start

# build
yarn build

# test
yarn test

# test w/ reloading
yarn test:watch

# generate docs
yarn docs

# publish (run this script instead of npm publish!)
./publish.sh
```
