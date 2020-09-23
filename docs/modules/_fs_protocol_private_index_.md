[Fission SDK](../README.md) › ["fs/protocol/private/index"](_fs_protocol_private_index_.md)

# Module: "fs/protocol/private/index"

## Index

### Functions

* [addNode](_fs_protocol_private_index_.md#const-addnode)
* [findLatestRevision](_fs_protocol_private_index_.md#const-findlatestrevision)
* [getByCID](_fs_protocol_private_index_.md#const-getbycid)
* [getByName](_fs_protocol_private_index_.md#const-getbyname)
* [getRevision](_fs_protocol_private_index_.md#const-getrevision)
* [readNode](_fs_protocol_private_index_.md#const-readnode)

## Functions

### `Const` addNode

▸ **addNode**(`mmpt`: [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md), `node`: [DecryptedNode](_fs_protocol_private_types_.md#decryptednode), `key`: string): *Promise‹[PrivateAddResult](_fs_protocol_private_types_.md#privateaddresult)›*

*Defined in [src/fs/protocol/private/index.ts:11](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/index.ts#L11)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md) |
`node` | [DecryptedNode](_fs_protocol_private_types_.md#decryptednode) |
`key` | string |

**Returns:** *Promise‹[PrivateAddResult](_fs_protocol_private_types_.md#privateaddresult)›*

___

### `Const` findLatestRevision

▸ **findLatestRevision**(`mmpt`: [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md), `bareName`: [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter), `key`: string, `lastKnownRevision`: number): *Promise‹Maybe‹Revision››*

*Defined in [src/fs/protocol/private/index.ts:55](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/index.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md) |
`bareName` | [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter) |
`key` | string |
`lastKnownRevision` | number |

**Returns:** *Promise‹Maybe‹Revision››*

___

### `Const` getByCID

▸ **getByCID**(`mmpt`: [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md), `cid`: CID, `key`: string): *Promise‹[DecryptedNode](_fs_protocol_private_types_.md#decryptednode)›*

*Defined in [src/fs/protocol/private/index.ts:42](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/index.ts#L42)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md) |
`cid` | CID |
`key` | string |

**Returns:** *Promise‹[DecryptedNode](_fs_protocol_private_types_.md#decryptednode)›*

___

### `Const` getByName

▸ **getByName**(`mmpt`: [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md), `name`: [PrivateName](_fs_protocol_private_namefilter_.md#privatename), `key`: string): *Promise‹Maybe‹[DecryptedNode](_fs_protocol_private_types_.md#decryptednode)››*

*Defined in [src/fs/protocol/private/index.ts:36](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/index.ts#L36)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md) |
`name` | [PrivateName](_fs_protocol_private_namefilter_.md#privatename) |
`key` | string |

**Returns:** *Promise‹Maybe‹[DecryptedNode](_fs_protocol_private_types_.md#decryptednode)››*

___

### `Const` getRevision

▸ **getRevision**(`mmpt`: [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md), `bareName`: [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter), `key`: string, `revision`: number): *Promise‹Maybe‹Revision››*

*Defined in [src/fs/protocol/private/index.ts:86](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/index.ts#L86)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](../classes/_fs_protocol_private_mmpt_.mmpt.md) |
`bareName` | [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter) |
`key` | string |
`revision` | number |

**Returns:** *Promise‹Maybe‹Revision››*

___

### `Const` readNode

▸ **readNode**(`cid`: CID, `key`: string): *Promise‹[DecryptedNode](_fs_protocol_private_types_.md#decryptednode)›*

*Defined in [src/fs/protocol/private/index.ts:28](https://github.com/fission-suite/webnative/blob/3b06253/src/fs/protocol/private/index.ts#L28)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |
`key` | string |

**Returns:** *Promise‹[DecryptedNode](_fs_protocol_private_types_.md#decryptednode)›*
