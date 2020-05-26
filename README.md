![](https://github.com/fission-suite/PROJECTNAME/raw/master/assets/logo.png?sanitize=true)


# Fission SDK

[![NPM](https://img.shields.io/npm/v/fission-sdk)](https://www.npmjs.com/package/fission-sdk)
[![Build Status](https://travis-ci.org/fission-suite/ts-sdk.svg?branch=master)](https://travis-ci.org/fission-suite/PROJECTNAME)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/fission-suite/blob/master/LICENSE)
[![Maintainability](https://api.codeclimate.com/v1/badges/524fbe384bb6c312fa11/maintainability)](https://codeclimate.com/github/fission-suite/ts-sdk/maintainability)
[![Built by FISSION](https://img.shields.io/badge/⌘-Built_by_FISSION-purple.svg)](https://fission.codes)
[![Discord](https://img.shields.io/discord/478735028319158273.svg)](https://discord.gg/zAQBDEq)
[![Discourse](https://img.shields.io/discourse/https/talk.fission.codes/topics)](https://talk.fission.codes)

Fission provides app hosting with user controlled data. We’re building a web native file system that combines files, encryption, and identity, like an open source iCloud.

Get started making fission-enabled apps with the Fission SDK!


## What you'll find here

The Fission SDK offers tools for:
- managing a user's web native **file system**
- managing a user's **private keys**
- **authenticating & authorizing** user actions

You'll also find some helper functions for interacting with some of the building blocks:
- [js-ipfs](https://github.com/ipfs/js-ipfs) for distributed file storage
- [keystore-idb](https://github.com/fission-suite/keystore-idb) for key management, encryption & digital signatures



# File System

The Web Native File System (WNFS) is built on top of IPFS. It's structured and functions similarly to a Unix-style file system, with one notable exception: it's a Directed Acyclic Graph (DAG), meaning that a given child can have more than one parent (think symlinks but without the "sym").

Each file system has a public tree and a private tree. All information (links, data, metadata, etc) in the private tree is encrypted. Decryption keys are stored in such a manner that access to a given folder grants access to all of its subfolders.


## Basics

WNFS exposes a familiar POSIX-style interface:
- `add`: add a file
- `cat`: retrieve a file
- `ls`: list a directory
- `mkdir`: create a directory
- `rm`: remove a file or directory


## Versions

Since the file system may evolve over time, a "version" is associated with each node in the file system (tracked with semver).

Currently two versions exist:
- `1.0.0`: file tree with metadata. Nodes in the file tree are structured as 2 layers where one layer contains "header" information (metadata, cache, etc), and the second layer contains data or links. **This is the default version, use this unless you have a good reason not to**.
- `0.0.0`: bare file tree. The public tree consists of [ipfs dag-pg](https://github.com/ipld/js-ipld-dag-pb) nodes. The private tree is encrypted links with no associated metadata. These should really only be used for vanity links to be rendered by a gateway.


## API

### Config

Each instantiation method takes an optional config. Below is the default config and descriptions of each value.

```ts
const defaultConfig = {
  keyName: 'filesystem-root', // the name of the key for the filesystem root as stored in IndexedDB
  version: '1.0.0' // the version of the filesystem as discussed above
}
```
---

### Instantiation

**empty**

Creates a file system with an empty public tree & an empty private tree at the root

Params:
- cfg: `FileSystemConfig` _optional_

Returns: `FileSystem` instance

Example:
```ts
import FileSystem from 'fission-sdk/fs'
const wnfs = await FileSystem.empty()
```

---

**fromCID**

Loads an existing file system from a CID

Params:
- cid: `CID` (`string`) **required**
- cfg: `FileSystemConfig` _optional_

Returns: `FileSystem` instance

Example:
```ts
import FileSystem from 'fission-sdk/fs'
const cid = "QmWKst5WVNTPfMsSFCQEJYBJLEsUZfghqrKXJBVU4EuA76"
const wnfs = await FileSystem.empty(cid)
```

---

**forUser**

Loads an existing file system from a username

Params:
- username: `string` **required**
- cfg: `FileSystemConfig` _optional_

Returns: `FileSystem` instance

Example:
```ts
import FileSystem from 'fission-sdk/fs'
const wnfs = await FileSystem.forUser("boris")
```

---

### Methods

Methods for interacting with the filesystem all use **absolute** paths. We're planning on adding a [stateful session](https://github.com/fission-suite/ts-sdk/issues/24) but for now, filesystem state will need to be tracked in your application.

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

Returns: `Links[]` list of links

Example:
```ts
// public
const links = await wnfs.ls("public/some/directory/path")
// private
const links = await wnfs.ls("private/some/directory/path")
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

**pinList**

Retrieves an array of all CIDs that need to be pinned in order to backup the FS.

Params: _none_

Returns: `CID[]`

Example:
```ts
const allCIDs = await wnfs.pinList()
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

**sync**

Ensures the latest version of the file system is added to IPFS and returns the root CID

Params: _none_

Returns: `CID` the updated _root_ CID for the file system

Example:
```ts
const rootCID = await wnfs.sync()
```



# Users & Key

## 🚧 Under Construction 🚧



# Building Blocks

**Warning: Here be 🐉! Only use lower level utilities if you know what you're doing.**

This library is built on top of [js-ipfs](https://github.com/ipfs/js-ipfs) and [keystore-idb](https://github.com/fission-suite/keystore-idb). If you have already integrated an ipfs daemon or keystore-idb into your web application, you probably don't want to have two instances floating around.

You can use one instance for your whole application by doing the following:
```ts
import ipfs from 'fission-sdk/ipfs'

// get the ipfs instance that the Fission SDK is using
const ipfs = await ipfs.getIpfs()

// OR set the ipfs to an instance that you already have
await ipfs.setIpfs(ipfsInstance)

```

```ts
import keystore from 'fission-sdk/keystore'

// get the keystore instance that the Fission SDK is using
const ks = await keystore.getKeystore()

// OR set the keystore to an instance that you already have
await keystore.setKeystore(keystoreInstance)
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

# publish (run this script instead of npm publish!)
./publish.sh
```
