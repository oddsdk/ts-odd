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
* [members](_fs_protocol_private_mmpt_.mmpt.md#members)
* [put](_fs_protocol_private_mmpt_.mmpt.md#put)
* [create](_fs_protocol_private_mmpt_.mmpt.md#static-create)
* [fromCID](_fs_protocol_private_mmpt_.mmpt.md#static-fromcid)

## Constructors

###  constructor

\+ **new MMPT**(`links`: Links): *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

*Defined in [src/fs/protocol/private/mmpt.ts:23](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L23)*

**Parameters:**

Name | Type |
------ | ------ |
`links` | Links |

**Returns:** *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

## Properties

###  links

• **links**: *Links*

*Defined in [src/fs/protocol/private/mmpt.ts:23](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L23)*

## Methods

###  add

▸ **add**(`name`: string, `value`: CID): *Promise‹this›*

*Defined in [src/fs/protocol/private/mmpt.ts:42](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L42)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`value` | CID |

**Returns:** *Promise‹this›*

___

###  exists

▸ **exists**(`name`: string): *Promise‹boolean›*

*Defined in [src/fs/protocol/private/mmpt.ts:90](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L90)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹boolean›*

___

###  get

▸ **get**(`name`: string): *Promise‹CID | null›*

*Defined in [src/fs/protocol/private/mmpt.ts:78](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L78)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹CID | null›*

___

###  members

▸ **members**(): *Promise‹Array‹Member››*

*Defined in [src/fs/protocol/private/mmpt.ts:94](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L94)*

**Returns:** *Promise‹Array‹Member››*

___

###  put

▸ **put**(): *Promise‹AddResult›*

*Defined in [src/fs/protocol/private/mmpt.ts:38](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L38)*

**Returns:** *Promise‹AddResult›*

___

### `Static` create

▸ **create**(): *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

*Defined in [src/fs/protocol/private/mmpt.ts:29](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L29)*

**Returns:** *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID): *Promise‹[MMPT](_fs_protocol_private_mmpt_.mmpt.md)›*

*Defined in [src/fs/protocol/private/mmpt.ts:33](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/mmpt.ts#L33)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |

**Returns:** *Promise‹[MMPT](_fs_protocol_private_mmpt_.mmpt.md)›*
