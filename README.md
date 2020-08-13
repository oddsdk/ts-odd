![](https://github.com/fission-suite/ts-sdk/raw/master/assets/logo.png?sanitize=true)


# Fission SDK

[![NPM](https://img.shields.io/npm/v/fission-sdk)](https://www.npmjs.com/package/fission-sdk)
[![Build Status](https://travis-ci.org/fission-suite/ts-sdk.svg?branch=master)](https://travis-ci.org/fission-suite/ts-sdk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/fission-suite/blob/master/LICENSE)
[![Maintainability](https://api.codeclimate.com/v1/badges/524fbe384bb6c312fa11/maintainability)](https://codeclimate.com/github/fission-suite/ts-sdk/maintainability)
[![Built by FISSION](https://img.shields.io/badge/⌘-Built_by_FISSION-purple.svg)](https://fission.codes)
[![Discord](https://img.shields.io/discord/478735028319158273.svg)](https://discord.gg/zAQBDEq)
[![Discourse](https://img.shields.io/discourse/https/talk.fission.codes/topics)](https://talk.fission.codes)

Fission provides app hosting with user controlled data. We’re building a web native file system that combines files, encryption, and identity, like an open source iCloud.

Get started making fission-enabled apps with the Fission SDK!


## What you'll find here

The Fission SDK offers tools for:
- authenticating through a Fission **authentication lobby**  
  (a lobby is where you can make a Fission account or link an account)
- managing your web native **file system**  
  (this is where a user's data lives)
- tools for building DIDs and UCANs.
- interacting with the users apps via the **platform APIs**

```ts
// ES6
import * as sdk from 'fission-sdk'

// Browser/UMD build
self.fissionSdk
```

See [`docs/`](docs/) for more detailed documentation based on the source code.



# Getting Started

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


## Other functions

- `await sdk.deauthenticate()`
- `await sdk.authenticatedUsername()`



# File System

The Web Native File System (WNFS) is built on top of IPFS. It's structured and functions similarly to a Unix-style file system, with one notable exception: it's a Directed Acyclic Graph (DAG), meaning that a given child can have more than one parent (think symlinks but without the "sym").

Each file system has a public tree and a private tree. All information (links, data, metadata, etc) in the private tree is encrypted. Decryption keys are stored in such a manner that access to a given folder grants access to all of its subfolders.

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


## API

### Methods

Methods for interacting with the filesystem all use **absolute** paths.

**add**

Adds some file content at a given path

Params:
- path: `string` **required**
- content: `FileContent` (`object | string | Blob | Buffer`) **required**

Returns: `CID` the updated _root_ CID for the file system

Example:
```ts
const content = "hello world"
const updatedCID = await wnfs.add("public/some/path/to/a/file", content)
// creates a file called "file" at "public/some/path/to/a"
```

---

**cat**

Retrieves some file content at a given path

Params:
- path: `string` **required**

Returns: `FileContent` (`object | string | Blob | Buffer`)

Example:
```ts
const content = await wnfs.cat("public/some/path/to/a/file")
```

---

**exists**

Checks if there is anything located at a given path

Params:
- path: `string` **required**

Returns: `boolean`

Example:
```ts
const bool = await wnfs.exists("private/path/to/file")
```

---

**get**

Retrieves the node at the given path, either a `File` or `Tree` object

Params:
- path: `string` **required**

Returns: `Tree | File | null`

Example:
```ts
const node = await wnfs.get("public/some/path")
```

---

**ls**

Returns a list of links at a given directory path

Params:
- path: `string` **required**

Returns: `{ [name: string]: Link }` Object with the file name as the key and its `Link` as the value.

Example:
```ts
linksObject = await wnfs.ls("public/some/directory/path") // public
linksObject = await wnfs.ls("private/some/directory/path") // private

// convert to list
links = Object.entries(linksObject)

// working with links
data = await Promise.all(links.map(([name, _]) => {
  return fs.cat(`private/some/directory/path/${name}`)
}))
```

---

**mkdir**

Creates a directory at the given path

Params:
- path: `string` **required**

Returns: `CID` the updated _root_ CID for the file system

Example:
```ts
const updatedCID = await wnfs.mkdir("public/some/directory/path")
// creates a directory called "path" at "public/some/directory"
```

---

**mv**

Move a directory or file from one path to another

Params:
- pathA: `string` **required**
- pathB: `string` **required**

Returns: `CID` the updated _root_ CID for the file system

Example:
```ts
const updatedCID = await wnfs.mv("public/doc.md", "private/Documents/notes.md")
```

---

**rm**

Removes a file or directory at a given path

Params:
- path: `string` **required**

Returns: `CID` the updated _root_ CID for the file system

Example:
```ts
const updatedCID = await wnfs.rm("private/some/path/to/a/file")
```

---

**write**

Alias for `add`.

Params:
- path: `string` **required**
- content: `FileContent` (`object | string | Blob | Buffer`) **required**

Returns: `CID` the updated _root_ CID for the file system

Example:
```ts
const content = "hello world"
const updatedCID = await wnfs.write("public/some/path/to/a/file", content)
```


## Web Worker

Can I use my file system in a web worker?  
Yes, this only requires a slightly different setup.

```ts
// UI thread
// `session.fs` will now be `null`
sdk.initialise({ loadFileSystem: false })

// Web Worker
const fs = await sdk.loadFileSystem()
```


## Versions

Since the file system may evolve over time, a "version" is associated with each node in the file system (tracked with semver).

Currently two versions exist:
- `1.0.0`: file tree with metadata. Nodes in the file tree are structured as 2 layers where one layer contains "header" information (metadata, cache, etc), and the second layer contains data or links. **This is the default version, use this unless you have a good reason not to**.
- `0.0.0`: bare file tree. The public tree consists of [ipfs dag-pg](https://github.com/ipld/js-ipld-dag-pb) nodes. The private tree is encrypted links with no associated metadata. These should really only be used for vanity links to be rendered by a gateway.



# Customisation

Customisation can be done using the `setup` module.  
Run these before anything else you do with the SDK.

```js
// custom api, lobby, and/or user domain
// (no need to specify each one)
sdk.setup.endpoints({
  api: "https://my.fission.api",
  lobby: "https://my.fission.lobby",
  user: "my.domain"
})

// js-ipfs options
// (see docs in src for more info)
sdk.setup.ipfs({ init: { repo: "my-ipfs-repo" } })
```



# Apps API

The sdk also exposes methods to interact with the apps associated with the user. This API must be prefixed with `apps`
- `apps.index`: A list of all of your apps and their associated domain names
- `apps.create`: Creates a new app, assigns an initial subdomain, and sets an asset placeholder
- `apps.deleteByURL`: Destroy app by any associated URL


## API

**apps.index**

A list of all of your apps and their associated domain names

Params:

Returns: `{ RandomKey : [ subdomain ] }` a map of subdomains

Example:
```ts
const index = await sdk.apps.index()
// { `SqlBackendKey {unSqlBackendKey = 216} `: ['your-fission-deployment.fission.app'] }
```

---

**apps.create**

Creates a new app, assigns an initial subdomain, and sets an asset placeholder

Params:
- subdomain: `string` **optional**

Returns: `subdomain` the newly created subdomain

Example:
```ts
const newApp = await sdk.apps.create()
// 'your-fission-deployment.fission.app'
```

---

**apps.deleteByURL**

Destroy app by any associated URL

Params:
- url: `string` **required**

Returns:

Example:
```ts
const deletedApp = await sdk.apps.deleteByURL('your-fission-deployment.fission.app')
//
```



# Building Blocks

**Warning: Here be 🐉! Only use lower level utilities if you know what you're doing.**

This library is built on top of [js-ipfs](https://github.com/ipfs/js-ipfs) and [keystore-idb](https://github.com/fission-suite/keystore-idb). If you have already integrated an ipfs daemon or keystore-idb into your web application, you probably don't want to have two instances floating around.

You can use one instance for your whole application by doing the following:
```ts
import ipfs from 'fission-sdk/ipfs'

// get the ipfs instance that the Fission SDK is using
const ipfsInstance = await ipfs.get()

// OR set the ipfs to an instance that you already have
await ipfs.set(ipfsInstance)

```

```ts
import keystore from 'fission-sdk/keystore'

// get the keystore instance that the Fission SDK is using
const keystoreInstance = await keystore.get()

// OR set the keystore to an instance that you already have
await keystore.set(keystoreInstance)
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

# test w/ reloading
yarn test:watch

# generate docs
yarn docs

# publish (run this script instead of npm publish!)
./publish.sh
```
