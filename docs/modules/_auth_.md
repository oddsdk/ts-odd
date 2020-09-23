[Fission SDK](../README.md) › ["auth"](_auth_.md)

# Module: "auth"

## Index

### Functions

* [authenticatedUsername](_auth_.md#authenticatedusername)
* [leave](_auth_.md#leave)
* [redirectToLobby](_auth_.md#redirecttolobby)

## Functions

###  authenticatedUsername

▸ **authenticatedUsername**(): *Promise‹string | null›*

*Defined in [src/auth.ts:17](https://github.com/fission-suite/webnative/blob/3b06253/src/auth.ts#L17)*

Retrieve the authenticated username.

**Returns:** *Promise‹string | null›*

___

###  leave

▸ **leave**(): *Promise‹void›*

*Defined in [src/auth.ts:26](https://github.com/fission-suite/webnative/blob/3b06253/src/auth.ts#L26)*

Leave.

Removes any trace of the user and redirects to the lobby.

**Returns:** *Promise‹void›*

___

###  redirectToLobby

▸ **redirectToLobby**(`permissions`: [Permissions](_ucan_permissions_.md#permissions), `redirectTo?`: undefined | string): *Promise‹void›*

*Defined in [src/auth.ts:42](https://github.com/fission-suite/webnative/blob/3b06253/src/auth.ts#L42)*

Redirects to a lobby.

NOTE: Only works on the main thread, as it uses `window.location`.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`permissions` | [Permissions](_ucan_permissions_.md#permissions) | The permissions from `initialise` |
`redirectTo?` | undefined &#124; string | Specify the URL you want users to return to.                   Uses the current url by default.  |

**Returns:** *Promise‹void›*
