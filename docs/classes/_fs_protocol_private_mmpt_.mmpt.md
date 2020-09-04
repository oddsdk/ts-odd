[Fission SDK](../README.md) › ["fs/protocol/private/mmpt"](../modules/_fs_protocol_private_mmpt_.md) › [MMPT](_fs_protocol_private_mmpt_.mmpt.md)

# Class: MMPT

Modified Merkle Patricia Tree
The tree has a node weight of 16
It stores items with hexidecimal keys and creates a new layer when a given layer has two keys that start with the same nibble

## Hierarchy

* **MMPT**

## Index

### Constructors

* [constructor](_fs_protocol_private_mmpt_.mmpt.md#constructor)

### Properties

* [links](_fs_protocol_private_mmpt_.mmpt.md#links)

### Methods

* [add](_fs_protocol_private_mmpt_.mmpt.md#add)
* [exists](_fs_protocol_private_mmpt_.mmpt.md#exists)
* [get](_fs_protocol_private_mmpt_.mmpt.md#get)
* [put](_fs_protocol_private_mmpt_.mmpt.md#put)
* [create](_fs_protocol_private_mmpt_.mmpt.md#static-create)
* [fromCID](_fs_protocol_private_mmpt_.mmpt.md#static-fromcid)

## Constructors

###  constructor

\+ **new MMPT**(`links`: Links): *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

*Defined in [src/fs/protocol/private/mmpt.ts:19](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L19)*

**Parameters:**

Name | Type |
------ | ------ |
`links` | Links |

**Returns:** *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

## Properties

###  links

• **links**: *Links*

*Defined in [src/fs/protocol/private/mmpt.ts:19](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L19)*

## Methods

###  add

▸ **add**(`name`: string, `value`: CID): *Promise‹this›*

*Defined in [src/fs/protocol/private/mmpt.ts:38](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`value` | CID |

**Returns:** *Promise‹this›*

___

###  exists

▸ **exists**(`name`: string): *Promise‹boolean›*

*Defined in [src/fs/protocol/private/mmpt.ts:86](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L86)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹boolean›*

___

###  get

▸ **get**(`name`: string): *Promise‹CID | null›*

*Defined in [src/fs/protocol/private/mmpt.ts:74](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L74)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹CID | null›*

___

###  put

▸ **put**(): *Promise‹AddResult›*

*Defined in [src/fs/protocol/private/mmpt.ts:34](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L34)*

**Returns:** *Promise‹AddResult›*

___

### `Static` create

▸ **create**(): *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

*Defined in [src/fs/protocol/private/mmpt.ts:25](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L25)*

**Returns:** *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID): *Promise‹[MMPT](_fs_protocol_private_mmpt_.mmpt.md)›*

*Defined in [src/fs/protocol/private/mmpt.ts:29](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/mmpt.ts#L29)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |

**Returns:** *Promise‹[MMPT](_fs_protocol_private_mmpt_.mmpt.md)›*
