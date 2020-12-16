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
import * as wn from 'webnative'

// Browser/UMD build
const wn = globalThis.webnative
```

See [`docs/`](docs/) for more detailed documentation based on the source code.



# Authentication

```ts
const state = await wn.initialise({
  permissions: {
    // Will ask the user permission to store
    // your apps data in `private/Apps/Nullsoft/Winamp`
    app: {
      name: "Winamp",
      creator: "Nullsoft"
    },

    // Ask the user permission for additional filesystem paths
    fs: {
      privatePaths: [ "Music" ],
      publicPaths: [ "Mixtapes" ]
    }
  }
})


switch (state.scenario) {

  case wn.Scenario.AuthCancelled:
    // User was redirected to lobby,
    // but cancelled the authorisation
    break;

  case wn.Scenario.AuthSucceeded:
  case wn.Scenario.Continuation:
    // State:
    // state.authenticated    -  Will always be `true` in these scenarios
    // state.newUser          -  If the user is new to Fission
    // state.throughLobby     -  If the user authenticated through the lobby, or just came back.
    // state.username         -  The user's username.
    //
    // ☞ We can now interact with our file system (more on that later)
    state.fs
    break;

  case wn.Scenario.NotAuthorised:
    wn.redirectToLobby(state.permissions)
    break;

}
```

`redirectToLobby` will redirect you to [auth.fission.codes](https://auth.fission.codes) our authentication lobby, where you'll be able to make a Fission an account and link with another account that's on another device or browser. The function takes a second, optional, parameter, the url that the lobby should redirect back to (the default is `location.href`).



# Web Native File System

The Web Native File System (WNFS) is built on top of the InterPlanetary File System (IPFS). It's structured and functions similarly to a Unix-style file system, with one notable exception: it's a Directed Acyclic Graph (DAG), meaning that a given child can have more than one parent (think symlinks but without the "sym").

Each file system has a public tree and a private tree, much like your MacOS, Windows, or Linux desktop file system. The public tree is "live" and publically accessible on the Internet. The private tree is encrypted so that only the owner can see the contents.

All information (links, data, metadata, etc) in the private tree is encrypted. Decryption keys are stored in such a manner that access to a given folder grants access to all of its subfolders.

```ts
// After initialising …
const fs = state.fs
const appPath = fs.appPath()

// List the user's private files that belong to this app
if (await fs.exists(appPath)) {
  await fs.ls(appPath)

// The user is new to the app, lets create the app-data directory.
} else {
  await fs.mkdir(appPath)
  await fs.publish()

}

// Create a sub directory
await fs.mkdir(fs.appPath([ "Sub Directory" ]))
await fs.publish()
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
- `write`: alias for `add`


## Publish

The `publish` function synchronises your file system with the Fission API and IPFS. We don't do this automatically because if you add a large set of data, you only want to do this after everything is added. Otherwise it would be too slow and we would have too many network requests to the API.


## Versioning

Each file and directory has a `history` property, which you can use to get an earlier version of that item. We use the `delta` variable as the order index. Primarily because the timestamps can be slightly out of sequence, due to device inconsistencies.

```ts
const file = await fs.get("private/Blog Posts/article.md")

file.history.list()
// { delta: -1, timestamp: 1606236743 }
// { delta: -2, timestamp: 1606236532 }

// Get the previous version
file.history.back()

// Go back two versions
const delta = -2
file.history.back(delta)

// Get the first version (ie. delta -2)
// by providing a timestamp
file.history.prior(1606236743)
```



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
yarn test:watch

# generate docs
yarn docs

# publish (run this script instead of npm publish!)
just publish
just publish-alpha
```
