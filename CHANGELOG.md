# Changelog

### v0.21.2

- `fs.mv` will no longer overwrite existing files, but instead throw an error.
- `initialise` will return a rejected Promise if the browser, or context, is not supported.
- DNSLink updated debug statement will no longer be shown if it failed to update.
- Hide iframe completely


### v0.21.1

Fix issue with `leave` function, `withoutRedirect` option should not be required.


### v0.21.0

Local IPFS data is shared across all browser tabs through the use of a shared web worker.



### v0.20.5

Adds the `read` and `write` methods to trees.


### v0.20.4

Fix `mv` issue.


### v0.20.3

Re-enable the `mv` filesystem function.


### v0.20.2

Fixed dependency loading issue.


### v0.20.1

Added versioning info to the README.


### v0.20.0

- Adds versioning
- Allows for concurrent filesystem operations



### v0.19.12

- Adds facts `fct` to the UCANs (v0.3.1)
- Update IPFS to v0.51.0


### v0.19.11

- Fixes `isUsernameAvailable` function (was broken due to adjusted `dataRoot.lookup` behaviour)
- Fixes issue with clearing data from browser.
- Tries reconnecting to Fission gateway if initial connection fails
- Removes `yarn` as a dependency (should've been devDependency)


### v0.19.10

Support the decoding of the url-safe base64 encoded read-key from the auth lobby.


### v0.19.9

The expiration timestamp of a UCAN cannot exceed that of its proof.


### v0.19.8

Bugfix: clear all data when using the `leave` function.


### v0.19.7

Bugfix: updates to files on public side were failing.


### v0.19.6

Bugfix: changes to public tree were not being reflected in pretty tree.


### v0.19.5

Don't error on failed pins.


### v0.19.2

Do not recursively pin content.


### v0.19.1

Permissions should be optional for `redirectToLobby` and `loadFileSystem` as well.


### v0.19

- Reliability & performance improvements
- Permissions are now optional



### v0.18.1

Added proofs to JWT for app routes (index, create & delete)


### v0.18.0

###### Breaking changes

- Renamed `publicise`/`publicize` to `publish`
- Renamed `prerequisites` to `permissions`
- The `app` and `fs` params to `initialise` are now grouped together by passing the `permissions` parameter.
- Decrypt `readKey` from auth lobby (behind the scenes)



### v0.17.3

Upgrade to js-ipfs v0.50


### v0.17.2

Connect to signaling server to find your other devices more easily.


### v0.17.1

Upgrade to CIDv1.


### v0.17

###### Changes

- `initialise` now accepts two additional options, named "prerequisites":
   ```javascript
   const { prerequisites, scenario, state } = await wn.initialise({
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
   })
   ```
- Those prerequisites are passed to the `wn.redirectToLobby` function.  
  (So the auth lobby has the correct parameters to determine the permissions to ask the user)
- Adds the ability to use multiple apps with one file system (closes #73)
- The SDK now handles multiple UCANs
- Works offline (fixes #82)
- Added `initialize` (american spelling) as an alias for `initialise`
- Adds ability to set the potency `ptc` of a UCAN
- Uses the Fission gateway as a [delegate node](https://github.com/ipfs/js-ipfs/blob/2b24f590041a0df9da87b75ae2344232fe22fe3a/docs/CONFIG.md#delegates)

###### Breaking changes

- File system actions (ie. POSIX interface methods) throw an error when they are missing the necessary permissions (read UCAN)
- Does no longer automatically call the `fs.publicise()` method. You have to call this yourself from now on.
- Changed the `fs.appPath` function (see README)
- Renamed `scenario.isAuthenticated` to `scenario.isAuthorised`
- Renamed `scenario.continuum` to `scenario.continuation`
- The first parameter to `redirectToLobby` has now become the second parameter.
- Replaced `deauthenticate` with `leave`, which now redirects to the auth lobby automatically, so you can "sign out" there as well.


### v0.16.x

- Fixed issue with private trees
- Improved connectivity
- Switched from AES-128 read keys to AES-256


### v0.16

- Big rewrite of filesystem
  - private side derives names using bloomfilters and stores nodes in an MMPT
  - reorganize header info on public side and store metadata/skeleton as cbor data
- Improved `fs.write` method, is an alias for `add` now (because `add` overwrites by default)
- Improved file system loading and saving


### v0.15

- Skipped because of a botched npm publish


### v0.14.3

- Added apps API `apps.create`, `apps.index`, `apps.deleteByURL`


### v0.14.2

- Improved DNSLink lookup error handling
- Reduced time-to-save for the file system to 3 seconds instead of 5
- Removed unnecessary `console.log` calls
- Updated default `js-ipfs` to `v0.48.1` (was `v0.48.0`)


### v0.14.1

Removed the default import from the index file. Now you use the SDK as follows, browser stays the same.

```js
import * as sdk from 'fission-sdk'
import { initialise } from 'fission-sdk'

sdk.initialise()
initialise()
```


### v0.14.0

- Renamed `isAuthenticated` to `initialise`
- `initialise` will return an instance of the file system (can be disabled in case you use web workers)
- Adds `loadFileSystem` to load a file system (called automatically from `initialise` unless disabled). This function is responsible for caching the file system locally and making a file system if the user hasn't got one yet.
- Adds the `fs.appPath.private` and `fs.appPath.public` function to build paths.
- Adds the `fs.exists`, `fs.read` and `fs.write` file system methods
