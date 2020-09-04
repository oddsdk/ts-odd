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

### Type aliases

* [AuthCancelled](_index_.md#authcancelled)
* [AuthSucceeded](_index_.md#authsucceeded)
* [Continuation](_index_.md#continuation)
* [FulfilledScenario](_index_.md#fulfilledscenario)
* [NotAuthorised](_index_.md#notauthorised)
* [Scenario](_index_.md#scenario)
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

*Defined in [src/index.ts:57](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L57)*

#### Type declaration:

* **authenticated**: *false*

* **cancellationReason**: *string*

* **throughLobby**: *true*

___

###  AuthSucceeded

Ƭ **AuthSucceeded**: *object*

*Defined in [src/index.ts:48](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L48)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *boolean*

* **throughLobby**: *true*

* **username**: *string*

___

###  Continuation

Ƭ **Continuation**: *object*

*Defined in [src/index.ts:63](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L63)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *false*

* **throughLobby**: *false*

* **username**: *string*

___

###  FulfilledScenario

Ƭ **FulfilledScenario**: *object*

*Defined in [src/index.ts:27](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L27)*

#### Type declaration:

* **prerequisites**: *[Prerequisites](_ucan_prerequisites_.md#prerequisites)*

* **scenario**: *[Scenario](_index_.md#scenario)*

* **state**: *[State](_index_.md#state)*

___

###  NotAuthorised

Ƭ **NotAuthorised**: *object*

*Defined in [src/index.ts:44](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L44)*

#### Type declaration:

* **authenticated**: *false*

___

###  Scenario

Ƭ **Scenario**: *object*

*Defined in [src/index.ts:20](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L20)*

#### Type declaration:

* **authCancelled**? : *undefined | true*

* **authSucceeded**? : *undefined | true*

* **continuation**? : *undefined | true*

* **notAuthorised**? : *undefined | true*

___

###  State

Ƭ **State**: *[NotAuthorised](_index_.md#notauthorised) | [AuthSucceeded](_index_.md#authsucceeded) | [AuthCancelled](_index_.md#authcancelled) | [Continuation](_index_.md#continuation)*

*Defined in [src/index.ts:38](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L38)*

## Variables

### `Const` fs

• **fs**: *[FileSystem](../classes/_fs_filesystem_.filesystem.md)* = fsClass

*Defined in [src/index.ts:176](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L176)*

## Functions

###  initialise

▸ **initialise**(`options`: object): *Promise‹[FulfilledScenario](_index_.md#fulfilledscenario)›*

*Defined in [src/index.ts:84](https://github.com/fission-suite/webnative/blob/935d7b8/src/index.ts#L84)*

Check if we're authenticated, process any lobby query-parameters present in the URL,
and initiate the user's file system if authenticated (can be disabled).

See `loadFileSystem` if you want to load the user's file system yourself.
NOTE: Only works on the main/ui thread, as it uses `window.location`.

**Parameters:**

▪ **options**: *object*

Name | Type |
------ | ------ |
`app?` | [AppInfo](_ucan_prerequisites_.md#appinfo) |
`autoRemoveUrlParams?` | undefined &#124; false &#124; true |
`fs?` | [FileSystemPrerequisites](_ucan_prerequisites_.md#filesystemprerequisites) |
`loadFileSystem?` | undefined &#124; false &#124; true |

**Returns:** *Promise‹[FulfilledScenario](_index_.md#fulfilledscenario)›*
