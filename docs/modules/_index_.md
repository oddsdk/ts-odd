[Fission SDK](../README.md) › ["index"](_index_.md)

# Module: "index"

## Index

### References

* [authenticatedUsername](_index_.md#authenticatedusername)
* [dataRoot](_index_.md#dataroot)
* [deauthenticate](_index_.md#deauthenticate)
* [did](_index_.md#did)
* [dns](_index_.md#dns)
* [loadFileSystem](_index_.md#loadfilesystem)
* [lobby](_index_.md#lobby)
* [redirectToLobby](_index_.md#redirecttolobby)
* [setup](_index_.md#setup)
* [ucan](_index_.md#ucan)

### Type aliases

* [AuthCancelled](_index_.md#authcancelled)
* [AuthSucceeded](_index_.md#authsucceeded)
* [Continuum](_index_.md#continuum)
* [FulfilledScenario](_index_.md#fulfilledscenario)
* [NotAuthenticated](_index_.md#notauthenticated)
* [Scenario](_index_.md#scenario)
* [State](_index_.md#state)

### Variables

* [fs](_index_.md#const-fs)

### Functions

* [initialise](_index_.md#initialise)

## References

###  authenticatedUsername

• **authenticatedUsername**:

___

###  dataRoot

• **dataRoot**:

___

###  deauthenticate

• **deauthenticate**:

___

###  did

• **did**:

___

###  dns

• **dns**:

___

###  loadFileSystem

• **loadFileSystem**:

___

###  lobby

• **lobby**:

___

###  redirectToLobby

• **redirectToLobby**:

___

###  setup

• **setup**:

___

###  ucan

• **ucan**:

## Type aliases

###  AuthCancelled

Ƭ **AuthCancelled**: *object*

*Defined in [src/index.ts:50](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L50)*

#### Type declaration:

* **authenticated**: *false*

* **cancellationReason**: *string*

* **throughLobby**: *true*

___

###  AuthSucceeded

Ƭ **AuthSucceeded**: *object*

*Defined in [src/index.ts:41](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L41)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *boolean*

* **throughLobby**: *true*

* **username**: *string*

___

###  Continuum

Ƭ **Continuum**: *object*

*Defined in [src/index.ts:56](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L56)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *false*

* **throughLobby**: *false*

* **username**: *string*

___

###  FulfilledScenario

Ƭ **FulfilledScenario**: *object*

*Defined in [src/index.ts:21](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L21)*

#### Type declaration:

* **scenario**: *[Scenario](_index_.md#scenario)*

* **state**: *[State](_index_.md#state)*

___

###  NotAuthenticated

Ƭ **NotAuthenticated**: *object*

*Defined in [src/index.ts:37](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L37)*

#### Type declaration:

* **authenticated**: *false*

___

###  Scenario

Ƭ **Scenario**: *object*

*Defined in [src/index.ts:14](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L14)*

#### Type declaration:

* **authCancelled**? : *undefined | true*

* **authSucceeded**? : *undefined | true*

* **continuum**? : *undefined | true*

* **notAuthenticated**? : *undefined | true*

___

###  State

Ƭ **State**: *[NotAuthenticated](_index_.md#notauthenticated) | [AuthSucceeded](_index_.md#authsucceeded) | [AuthCancelled](_index_.md#authcancelled) | [Continuum](_index_.md#continuum)*

*Defined in [src/index.ts:31](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L31)*

## Variables

### `Const` fs

• **fs**: *[FileSystem](../classes/_fs_filesystem_.filesystem.md)* = fsClass

*Defined in [src/index.ts:143](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L143)*

## Functions

###  initialise

▸ **initialise**(`options`: object): *Promise‹[FulfilledScenario](_index_.md#fulfilledscenario)›*

*Defined in [src/index.ts:77](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/index.ts#L77)*

Check if we're authenticated, process any lobby query-parameters present in the URL,
and initiate the user's file system if authenticated (can be disabled).

See `loadFileSystem` if you want to load the user's file system yourself.
NOTE: Only works on the main/ui thread, as it uses `window.location`.

**Parameters:**

▪ **options**: *object*

Name | Type |
------ | ------ |
`autoRemoveUrlParams?` | undefined &#124; false &#124; true |
`loadFileSystem?` | undefined &#124; false &#124; true |

**Returns:** *Promise‹[FulfilledScenario](_index_.md#fulfilledscenario)›*
