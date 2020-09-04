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

*Defined in [src/fs/protocol/private/index.ts:11](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/index.ts#L11)*

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

*Defined in [src/fs/protocol/private/index.ts:46](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/index.ts#L46)*

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

*Defined in [src/fs/protocol/private/index.ts:33](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/index.ts#L33)*

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

*Defined in [src/fs/protocol/private/index.ts:27](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/index.ts#L27)*

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

*Defined in [src/fs/protocol/private/index.ts:77](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/index.ts#L77)*

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

*Defined in [src/fs/protocol/private/index.ts:19](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/index.ts#L19)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |
`key` | string |

**Returns:** *Promise‹[DecryptedNode](_fs_protocol_private_types_.md#decryptednode)›*
