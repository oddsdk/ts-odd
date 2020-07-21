[Fission SDK](../README.md) › ["auth"](_auth_.md)

# Module: "auth"

## Index

### Functions

* [authenticatedUsername](_auth_.md#authenticatedusername)
* [deauthenticate](_auth_.md#deauthenticate)
* [isAuthenticated](_auth_.md#isauthenticated)
* [redirectToLobby](_auth_.md#redirecttolobby)

## Functions

###  authenticatedUsername

▸ **authenticatedUsername**(): *Promise‹string | null›*

*Defined in [src/auth.ts:12](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/auth.ts#L12)*

Retrieve the authenticated username.

**Returns:** *Promise‹string | null›*

___

###  deauthenticate

▸ **deauthenticate**(): *Promise‹void›*

*Defined in [src/auth.ts:21](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/auth.ts#L21)*

Deauthenticate.

Removes the stored UCAN we got from a lobby.

**Returns:** *Promise‹void›*

___

###  isAuthenticated

▸ **isAuthenticated**(`options`: object): *Promise‹object | object | object›*

*Defined in [src/auth.ts:31](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/auth.ts#L31)*

Check if we're authenticated and process any lobby query-parameters present in the URL.

NOTE: Only works on the main thread, as it uses `window.location`.

**Parameters:**

▪ **options**: *object*

Name | Type |
------ | ------ |
`autoRemoveUrlParams?` | undefined &#124; false &#124; true |

**Returns:** *Promise‹object | object | object›*

___

###  redirectToLobby

▸ **redirectToLobby**(`returnTo?`: undefined | string): *Promise‹void›*

*Defined in [src/auth.ts:97](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/auth.ts#L97)*

Redirects to a lobby.

NOTE: Only works on the main thread, as it uses `window.location`.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`returnTo?` | undefined &#124; string | Specify the URL you want users to return to.                 Uses the current url by default.  |

**Returns:** *Promise‹void›*
