[Fission SDK](../README.md) › ["lobby/index"](_lobby_index_.md)

# Module: "lobby/index"

## Index

### Functions

* [createAccount](_lobby_index_.md#createaccount)
* [isUsernameAvailable](_lobby_index_.md#isusernameavailable)
* [isUsernameValid](_lobby_index_.md#isusernamevalid)

## Functions

###  createAccount

▸ **createAccount**(`userProps`: object): *Promise‹object›*

*Defined in [src/lobby/index.ts:13](https://github.com/fission-suite/webnative/blob/7fcf931/src/lobby/index.ts#L13)*

Create a user account.

**Parameters:**

▪ **userProps**: *object*

Name | Type |
------ | ------ |
`email` | string |
`username` | string |

**Returns:** *Promise‹object›*

___

###  isUsernameAvailable

▸ **isUsernameAvailable**(`username`: string): *Promise‹boolean›*

*Defined in [src/lobby/index.ts:43](https://github.com/fission-suite/webnative/blob/7fcf931/src/lobby/index.ts#L43)*

Check if a username is available.

**Parameters:**

Name | Type |
------ | ------ |
`username` | string |

**Returns:** *Promise‹boolean›*

___

###  isUsernameValid

▸ **isUsernameValid**(`username`: string): *boolean*

*Defined in [src/lobby/index.ts:54](https://github.com/fission-suite/webnative/blob/7fcf931/src/lobby/index.ts#L54)*

Check if a username is valid.

**Parameters:**

Name | Type |
------ | ------ |
`username` | string |

**Returns:** *boolean*
