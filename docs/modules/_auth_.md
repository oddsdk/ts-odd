[Fission SDK](../README.md) › ["auth"](_auth_.md)

# Module: "auth"

## Index

### Functions

* [authenticatedUsername](_auth_.md#authenticatedusername)
* [deauthenticate](_auth_.md#deauthenticate)
* [redirectToLobby](_auth_.md#redirecttolobby)

## Functions

###  authenticatedUsername

▸ **authenticatedUsername**(): *Promise‹string | null›*

*Defined in [src/auth.ts:15](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/auth.ts#L15)*

Retrieve the authenticated username.

**Returns:** *Promise‹string | null›*

___

###  deauthenticate

▸ **deauthenticate**(): *Promise‹void›*

*Defined in [src/auth.ts:24](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/auth.ts#L24)*

Deauthenticate.

Removes the stored UCAN we got from a lobby.

**Returns:** *Promise‹void›*

___

###  redirectToLobby

▸ **redirectToLobby**(`returnTo?`: undefined | string): *Promise‹void›*

*Defined in [src/auth.ts:37](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/auth.ts#L37)*

Redirects to a lobby.

NOTE: Only works on the main thread, as it uses `window.location`.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`returnTo?` | undefined &#124; string | Specify the URL you want users to return to.                 Uses the current url by default.  |

**Returns:** *Promise‹void›*
