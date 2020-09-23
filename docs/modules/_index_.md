[Fission SDK](../README.md) › ["index"](_index_.md)

# Module: "index"

## Index

### References

* [apps](_index_.md#apps)
* [authenticatedUsername](_index_.md#authenticatedusername)
* [dataRoot](_index_.md#dataroot)
* [did](_index_.md#did)
* [dns](_index_.md#dns)
* [errors](_index_.md#errors)
* [initialize](_index_.md#initialize)
* [leave](_index_.md#leave)
* [loadFileSystem](_index_.md#loadfilesystem)
* [lobby](_index_.md#lobby)
* [redirectToLobby](_index_.md#redirecttolobby)
* [setup](_index_.md#setup)
* [ucan](_index_.md#ucan)

### Enumerations

* [Scenario](../enums/_index_.scenario.md)

### Type aliases

* [AuthCancelled](_index_.md#authcancelled)
* [AuthSucceeded](_index_.md#authsucceeded)
* [Continuation](_index_.md#continuation)
* [NotAuthorised](_index_.md#notauthorised)
* [State](_index_.md#state)

### Variables

* [fs](_index_.md#const-fs)

### Functions

* [initialise](_index_.md#initialise)

## References

###  apps

• **apps**:

___

###  authenticatedUsername

• **authenticatedUsername**:

___

###  dataRoot

• **dataRoot**:

___

###  did

• **did**:

___

###  dns

• **dns**:

___

###  errors

• **errors**:

___

###  initialize

• **initialize**:

___

###  leave

• **leave**:

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

*Defined in [src/index.ts:55](https://github.com/fission-suite/webnative/blob/3b06253/src/index.ts#L55)*

#### Type declaration:

* **authenticated**: *false*

* **cancellationReason**: *string*

* **permissions**: *Maybe‹[Permissions](_ucan_permissions_.md#permissions)›*

* **scenario**: *[AuthCancelled](../enums/_index_.scenario.md#authcancelled)*

* **throughLobby**: *true*

___

###  AuthSucceeded

Ƭ **AuthSucceeded**: *object*

*Defined in [src/index.ts:43](https://github.com/fission-suite/webnative/blob/3b06253/src/index.ts#L43)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *boolean*

* **permissions**: *Maybe‹[Permissions](_ucan_permissions_.md#permissions)›*

* **scenario**: *[AuthSucceeded](../enums/_index_.scenario.md#authsucceeded)*

* **throughLobby**: *true*

* **username**: *string*

___

###  Continuation

Ƭ **Continuation**: *object*

*Defined in [src/index.ts:64](https://github.com/fission-suite/webnative/blob/3b06253/src/index.ts#L64)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *false*

* **permissions**: *Maybe‹[Permissions](_ucan_permissions_.md#permissions)›*

* **scenario**: *[Continuation](../enums/_index_.scenario.md#continuation)*

* **throughLobby**: *false*

* **username**: *string*

___

###  NotAuthorised

Ƭ **NotAuthorised**: *object*

*Defined in [src/index.ts:36](https://github.com/fission-suite/webnative/blob/3b06253/src/index.ts#L36)*

#### Type declaration:

* **authenticated**: *false*

* **permissions**: *Maybe‹[Permissions](_ucan_permissions_.md#permissions)›*

* **scenario**: *[NotAuthorised](../enums/_index_.scenario.md#notauthorised)*

___

###  State

Ƭ **State**: *[NotAuthorised](_index_.md#notauthorised) | [AuthSucceeded](_index_.md#authsucceeded) | [AuthCancelled](_index_.md#authcancelled) | [Continuation](_index_.md#continuation)*

*Defined in [src/index.ts:30](https://github.com/fission-suite/webnative/blob/3b06253/src/index.ts#L30)*

## Variables

### `Const` fs

• **fs**: *[FileSystem](../classes/_fs_filesystem_.filesystem.md)* = fsClass

*Defined in [src/index.ts:180](https://github.com/fission-suite/webnative/blob/3b06253/src/index.ts#L180)*

## Functions

###  initialise

▸ **initialise**(`options`: object): *Promise‹[State](_index_.md#state)›*

*Defined in [src/index.ts:88](https://github.com/fission-suite/webnative/blob/3b06253/src/index.ts#L88)*

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
`permissions` | [Permissions](_ucan_permissions_.md#permissions) |

**Returns:** *Promise‹[State](_index_.md#state)›*
