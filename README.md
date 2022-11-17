# Webnative SDK

[![NPM](https://img.shields.io/npm/v/webnative)](https://www.npmjs.com/package/webnative)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/fission-suite/blob/master/LICENSE)
[![Built by FISSION](https://img.shields.io/badge/⌘-Built_by_FISSION-purple.svg)](https://fission.codes)
[![Discord](https://img.shields.io/discord/478735028319158273.svg)](https://discord.gg/zAQBDEq)
[![Discourse](https://img.shields.io/discourse/https/talk.fission.codes/topics)](https://talk.fission.codes)

The Webnative SDK empowers developers to build fully distributed web applications without needing a complex back-end. The SDK provides:

- **User accounts** via the browser's [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) or by using a blockchain wallet as a [webnative plugin](https://github.com/fission-codes/webnative-walletauth).
- **Authorization** using [UCAN](https://ucan.xyz/).
- **Encrypted file storage** via the [Webnative File System](https://guide.fission.codes/developers/webnative/file-system-wnfs) backed by [IPLD](https://ipld.io/).
- **Key management** via websockets and a two-factor auth-like flow.

Webnative applications work offline and store data encrypted for the user by leveraging the power of the web platform. You can read more about Webnative in Fission's [Webnative Guide](https://guide.fission.codes/developers/webnative). There's also an API reference which can be found at [webnative.fission.app](https://webnative.fission.app)



# Getting started

```ts
// ESM
import * as wn from "webnative"

// Browser/UMD build
const wn = globalThis.webnative
```

## Creating a Program

A Webnative program is an assembly that makes up a part of, or a whole distributed web application. It consists out of several components that can be customised. _We'll stick with the default components for now, which means we'll be using the Web Crypto API._

```ts
const program = await wn.program({
  // Can also be a string, used as an identifier for caches.
  // If you're developing multiple apps on the same localhost port,
  // make sure these differ.
  id: { creator: "Nullsoft", name: "Winamp" }

}).catch(error => {
  switch (error) {
    case webnative.ProgramError.InsecureContext:
      // Webnative requires HTTPS
      break;
    case webnative.ProgramError.UnsupportedBrowser:
      break;
  }

})
```

That gives us a `Program` object, with this we can create a new user session or reuse the existing session. There's two distinctive ways to create a user session, either by using an authentication strategy or by using something we call "confidences". More on the latter in a bit, let's start with the default authentication strategy.

```ts
let session

// Do we have an existing session?
if (program.session) {
  session = program.session

// If not, let's authenticate.
// (a) new user, register a new Fission account
} else if (registerNewUser) {
  const { success } = await program.auth.register({ username: "llama" })
  session = success ? program.auth.session() : null

// (b) existing user, link a new device
} else {
  // On device with existing session:
  const producer = program.auth.accountProducer(program.session.username)

  producer.on("challenge", challenge => {
    // Either show `challenge.pin` or have the user input a PIN and see if they're equal.
    if (userInput === challenge.pin) challenge.confirmPin()
    else challenge.rejectPin()
  })

  producer.on("link", ({ approved }) => {
    if (approved) console.log("Link device successfully")
  })

  // On device without session:
  //     Somehow you'll need to get a hold of the username.
  //     Few ideas: URL query param, QR code, manual input.
  const consumer = program.auth.accountConsumer(username)

  consumer.on("challenge", ({ pin }) => {
    showPinOnUI(pin)
  })

  consumer.on("link", ({ approved, username }) => {
    if (approved) {
      console.log(`Successfully authenticated as ${username}`)
      session = program.auth.session()
    }
  })
}
```

Alternatively you can use "confidences", this system is used when you want partial access to a file system. At the moment of writing this only supported through the "Fission auth lobby", which is a Webnative app that uses the auth strategy shown above.

This Fission auth lobby flow works as follows:
1. You get redirected to the Fission lobby from your app.
2. Here you create an account like in the normal auth strategy flow shown above.
3. The lobby shows what your app wants to access in your file system.
4. You approve or deny these permissions and get redirected back to your app.
5. Your app collects the encrypted information (UCANs & file system secrets).
6. You can create a user session.

```ts
// We define a `Permissions` object,
// this represents what permissions to ask the user.
const permissions = {
  // Ask permission to write to and read from the directory:
  // private/Apps/Nullsoft/Winamp
  app: { creator: "Nullsoft", name: "Winamp" }
}

// We need to pass this object to our program
const program = await webnative.program({
  permissions
})

// (a) Whenever you are ready to redirect to the lobby, call this:
program.confidences.request(permissions)

// (b) When you get redirected back and your program is ready,
// you will have access to your user session.
session = program.session
```

Once you have your `Session`, you have access to the file system 🎉

```ts
const fs = session.fs
```

__Notes:__

- You can use alternative authentication strategies, such as [webnative-walletauth](https://github.com/fission-codes/webnative-walletauth).
- You can remove all traces of the user using `await session.destroy()`
- You can load the file system separately, in case you're using web worker. This is done using the combination of `configuration.filesystem.loadImmediately = false` and `program.loadFileSystem()`


## Working with the file system

The Web Native File System (WNFS) is a file system built on top of [IPLD](https://ipld.io/). Each file system has a public side and a private side, much like your macOS, Windows, or Linux desktop file system. The public side is "live" and publicly accessible on the Internet. The private side is encrypted so that only the owner can see the contents. Read more about it [here](https://github.com/wnfs-wg).

```ts
const { Branch } = wn.path

// List the user's private files
await fs.ls(
  wn.path.directory(Branch.Private)
)

// Create a sub directory and add some content
const contentPath = wn.file(
  Branch.Private, "Sub Directory", "hello.txt"
)

await fs.write(
  contentPath,
  new TextEncoder().encode("👋") // Uint8Array
)

// Announce the changes to your other devices
await fs.publish()

// Read the file
const content = new TextDecoder().decode(
  await fs.read(contentPath)
)
```

That's it, you have successfully created a Webnative app! 🚀


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


## Versioning

Each file and directory has a `history` property, which you can use to get an earlier version of that item. We use the `delta` variable as the order index. Primarily because the timestamps can be slightly out of sequence, due to device inconsistencies.

```ts
const file = await fs.get(wn.path.file("private", "Blog Posts", "article.md"))

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


[https://guide.fission.codes/developers/webnative/sharing-private-data](https://guide.fission.codes/developers/webnative/sharing-private-data)