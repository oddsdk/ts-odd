[Fission SDK](../README.md) › ["index"](_index_.md)

# Module: "index"

## Index

### Type aliases

* [AuthCancelled](_index_.md#authcancelled)
* [AuthSucceeded](_index_.md#authsucceeded)
* [Continuum](_index_.md#continuum)
* [FulfilledScenario](_index_.md#fulfilledscenario)
* [NotAuthenticated](_index_.md#notauthenticated)
* [Scenario](_index_.md#scenario)
* [State](_index_.md#state)

## Type aliases

###  AuthCancelled

Ƭ **AuthCancelled**: *object*

*Defined in [src/index.ts:61](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/index.ts#L61)*

#### Type declaration:

* **authenticated**: *false*

* **cancellationReason**: *string*

* **throughLobby**: *true*

___

###  AuthSucceeded

Ƭ **AuthSucceeded**: *object*

*Defined in [src/index.ts:52](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/index.ts#L52)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *boolean*

* **throughLobby**: *true*

* **username**: *string*

___

###  Continuum

Ƭ **Continuum**: *object*

*Defined in [src/index.ts:67](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/index.ts#L67)*

#### Type declaration:

* **authenticated**: *true*

* **fs**? : *[FileSystem](../classes/_fs_filesystem_.filesystem.md)*

* **newUser**: *false*

* **throughLobby**: *false*

* **username**: *string*

___

###  FulfilledScenario

Ƭ **FulfilledScenario**: *object*

*Defined in [src/index.ts:32](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/index.ts#L32)*

#### Type declaration:

* **scenario**: *[Scenario](_index_.md#scenario)*

* **state**: *[State](_index_.md#state)*

___

###  NotAuthenticated

Ƭ **NotAuthenticated**: *object*

*Defined in [src/index.ts:48](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/index.ts#L48)*

#### Type declaration:

* **authenticated**: *false*

___

###  Scenario

Ƭ **Scenario**: *object*

*Defined in [src/index.ts:25](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/index.ts#L25)*

#### Type declaration:

* **authCancelled**? : *undefined | true*

* **authSucceeded**? : *undefined | true*

* **continuum**? : *undefined | true*

* **notAuthenticated**? : *undefined | true*

___

###  State

Ƭ **State**: *[NotAuthenticated](_index_.md#notauthenticated) | [AuthSucceeded](_index_.md#authsucceeded) | [AuthCancelled](_index_.md#authcancelled) | [Continuum](_index_.md#continuum)*

*Defined in [src/index.ts:42](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/index.ts#L42)*
