# ODD SDK

[![NPM](https://img.shields.io/npm/v/@oddjs/odd)](https://www.npmjs.com/package/@oddjs/odd)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/oddsdk/ts-odd/blob/main/LICENSE)
[![Built by FISSION](https://img.shields.io/badge/⌘-Built_by_FISSION-purple.svg)](https://fission.codes)
[![Discord](https://img.shields.io/discord/478735028319158273.svg)](https://discord.gg/zAQBDEq)
[![Discourse](https://img.shields.io/discourse/https/talk.fission.codes/topics)](https://talk.fission.codes)

The ODD SDK empowers developers to build fully distributed web applications without needing a complex back-end. The SDK provides:

- **User accounts** via the browser's [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) or by using a blockchain wallet as a [ODD plugin](https://github.com/oddsdk/odd-walletauth).
- **Authorization** using [UCAN](https://ucan.xyz/).
- **Encrypted file storage** using [WNFS](https://docs.odd.dev/file-system-wnfs) backed by [IPLD](https://ipld.io/).
- **Key management** using websockets and a two-factor auth-like flow.

ODD applications work offline and store data encrypted for the user by leveraging the power of the web platform. You can read more about the ODD SDK in Fission's [ODD SDK Guide](https://docs.odd.dev). There's also an API reference which can be found at [api.odd.dev](https://api.odd.dev)

# Installation

The `ts-odd` package is published on yarn, pnpm and npm as `@oddjs/odd`:

### npm

```bash
npm install @oddjs/odd
```

### pnpm

```bash
pnpm install @oddjs/odd
```

### yarn

```bash
yarn add @oddjs/odd
```

# Getting started

```ts
// ESM
import * as odd from "@oddjs/odd"

// Browser/UMD build
const odd = globalThis.oddjs
```

## Creating a Program

An ODD program is an assembly of components that make up a distributed web application. Several of the components can be customized. _Let's stick with the default components for now, which means we'll be using the Web Crypto API._

```ts
const program = await odd.program({
  // Can also be a string, used as an identifier for caches.
  // If you're developing multiple apps on the same localhost port,
  // make sure these differ.
  namespace: { creator: "Nullsoft", name: "Winamp" }

}).catch(error => {
  switch (error) {
    case odd.ProgramError.InsecureContext:
      // The ODD SDK requires HTTPS
      break;
    case odd.ProgramError.UnsupportedBrowser:
      break;
  }

})
```

`odd.program` returns a `Program` object, which can create a new user session or reuse an existing session. There are two ways to create a user session, either by using an authentication strategy or by requesting access from another app through the "capabilities" system. Let's start with the default authentication strategy.

```ts
let session

// Do we have an existing session?
if (program.session) {
  session = program.session

// If not, let's authenticate.
// (a) new user, register a new Fission account
} else if (userChoseToRegister) {
  const { success } = await program.auth.register({ username: "llama" })
  session = success ? program.auth.session() : null

// (b) existing user, link a new device
} else {
  // On device with existing session:
  const producer = await program.auth.accountProducer(program.session.username)

  producer.on("challenge", challenge => {
    // Either show `challenge.pin` or have the user input a PIN and see if they're equal.
    if (userInput === challenge.pin) challenge.confirmPin()
    else challenge.rejectPin()
  })

  producer.on("link", ({ approved }) => {
    if (approved) console.log("Link device successfully")
  })

  // On device without session:
  //     Somehow you'll need to get ahold of the username.
  //     Few ideas: URL query param, QR code, manual input.
  const consumer = await program.auth.accountConsumer(username)

  consumer.on("challenge", ({ pin }) => {
    showPinOnUI(pin)
  })

  consumer.on("link", async ({ approved, username }) => {
    if (approved) {
      console.log(`Successfully authenticated as ${username}`)
      session = await program.auth.session()
    }
  })
}
```

Alternatively you can use the "capabilities" system when you want partial access to a file system. At the moment of writing, capabilities are only supported through the "Fission auth lobby", which is an ODD app that uses the auth strategy shown above.

This Fission auth lobby flow works as follows:
1. You get redirected to the Fission lobby from your app.
2. Here you create an account like in the normal auth strategy flow shown above.
3. The lobby shows what your app wants to access in your file system.
4. You approve or deny these permissions and get redirected back to your app.
5. Your app collects the encrypted information (UCANs & file system secrets).
6. Your app can create a user session.

```ts
// We define a `Permissions` object,
// this represents what permissions to ask the user.
const permissions = {
  // Ask permission to write to and read from the directory:
  // private/Apps/Nullsoft/Winamp
  app: { creator: "Nullsoft", name: "Winamp" }
}

// We need to pass this object to our program
const program = await odd.program({
  namespace: { creator: "Nullsoft", name: "Winamp" },
  permissions
})

// (a) Whenever you are ready to redirect to the lobby, call this:
program.capabilities.request()

// (b) When you get redirected back and your program is ready,
// you will have access to your user session.
session = program.session
```

Once you have your `Session`, you have access to your file system 🎉

```ts
const fs = session.fs
```

__Notes:__

- You can use alternative authentication strategies, such as [odd-walletauth](https://github.com/oddsdk/odd-walletauth).
- You can remove all traces of the user using `await session.destroy()`
- You can load the file system separately if you're using a web worker. This is done using the combination of `configuration.fileSystem.loadImmediately = false` and `program.fileSystem.load()`
- You can recover a file system if you've downloaded a Recovery Kit by calling `program.fileSystem.recover({ newUsername, oldUsername, readKey })`. The `oldUsername` and `readKey` can be parsed from the uploaded Recovery Kit and the `newUsername` can be generated before calling the function. Please refer to [this example](https://github.com/oddsdk/odd-app-template/blob/5498e7062a4578028b8b55d2ac4c611bd5daab85/src/components/auth/recover/HasRecoveryKit.svelte#L49) from Fission's ODD App Template. Additionally, if you would like to see how to generate a Recovery Kit, you can reference [this example](https://github.com/oddsdk/odd-app-template/blob/main/src/lib/account-settings.ts#L186)


## Working with the file system

The Webnative File System (WNFS) is a file system built on top of [IPLD](https://ipld.io/). It supports operations similar to your macOS, Windows, or Linux desktop file system. It consists of a public and private branch: The public branch is "live" and publicly accessible on the Internet. The private branch is encrypted so that only the owner can see the contents. Read more about it [here](https://github.com/wnfs-wg).

```ts
const { Branch } = odd.path

// List the user's private files
await fs.ls(
  odd.path.directory(Branch.Private)
)

// Create a sub directory and add some content
const contentPath = odd.file(
  Branch.Private, "Sub Directory", "hello.txt"
)

await fs.write(
  contentPath,
  new TextEncoder().encode("👋") // Uint8Array
)

// Persist changes and announce them to your other devices
await fs.publish()

// Read the file
const content = new TextDecoder().decode(
  await fs.read(contentPath)
)
```

That's it, you have successfully created an ODD app! 🚀


## POSIX Interface

WNFS exposes a familiar POSIX-style interface:
- `exists`: check if a file or directory exists
- `ls`: list a directory
- `mkdir`: create a directory
- `mv`: move a file or directory
- `read`: read from a file
- `rm`: remove a file or directory
- `write`: write to a file


## Versioning

Each file and directory has a `history` property, which you can use to get an earlier version of that item. We use the `delta` variable as the order index. Primarily because the timestamps can be slightly out of sequence, due to device inconsistencies.

```ts
const file = await fs.get(odd.path.file("private", "Blog Posts", "article.md"))

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


## Sharing Private Data


[https://docs.odd.dev/sharing-private-data](https://docs.odd.dev/sharing-private-data)


## Migration

Some versions of the ODD SDK require apps to migrate their codebase to address breaking changes. Please see our [migration guide](https://docs.odd.dev/developers/odd/migration) for help migrating your apps to the latest ODD SDK version.


## Debugging

Debugging mode can be enable by setting `debug` to `true` in your configuration object that you pass to your `Program`. By default this will add your programs to the global context object (eg. `window`) under `globalThis.__odd.programs` (can be disabled, see API docs).

```ts
const appInfo = { creator: "Nullsoft", name: "Winamp" }

await odd.program({
  namespace: appInfo,
  debug: true
})

// Automatically exposed Program in debug mode
const program = globalThis.__odd[ odd.namespace(appInfo) ] // namespace: "Nullsoft/Winamp"
```
