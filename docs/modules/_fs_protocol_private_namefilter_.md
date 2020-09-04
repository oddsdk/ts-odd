[Fission SDK](../README.md) › ["fs/protocol/private/namefilter"](_fs_protocol_private_namefilter_.md)

# Module: "fs/protocol/private/namefilter"

## Index

### Type aliases

* [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter)
* [PrivateName](_fs_protocol_private_namefilter_.md#privatename)
* [RevisionNameFilter](_fs_protocol_private_namefilter_.md#revisionnamefilter)
* [SaturatedNameFilter](_fs_protocol_private_namefilter_.md#saturatednamefilter)

### Functions

* [addRevision](_fs_protocol_private_namefilter_.md#const-addrevision)
* [addToBare](_fs_protocol_private_namefilter_.md#const-addtobare)
* [createBare](_fs_protocol_private_namefilter_.md#const-createbare)
* [fromHex](_fs_protocol_private_namefilter_.md#const-fromhex)
* [saturate](_fs_protocol_private_namefilter_.md#const-saturate)
* [toHash](_fs_protocol_private_namefilter_.md#const-tohash)
* [toHex](_fs_protocol_private_namefilter_.md#const-tohex)
* [toPrivateName](_fs_protocol_private_namefilter_.md#const-toprivatename)

## Type aliases

###  BareNameFilter

Ƭ **BareNameFilter**: *Opaque‹"BareNameFilter", string›*

*Defined in [src/fs/protocol/private/namefilter.ts:19](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L19)*

___

###  PrivateName

Ƭ **PrivateName**: *Opaque‹"PrivateName", string›*

*Defined in [src/fs/protocol/private/namefilter.ts:16](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L16)*

___

###  RevisionNameFilter

Ƭ **RevisionNameFilter**: *Opaque‹"RevisionNameFilter", string›*

*Defined in [src/fs/protocol/private/namefilter.ts:22](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L22)*

___

###  SaturatedNameFilter

Ƭ **SaturatedNameFilter**: *Opaque‹"SaturatedNameFilter", string›*

*Defined in [src/fs/protocol/private/namefilter.ts:25](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L25)*

## Functions

### `Const` addRevision

▸ **addRevision**(`bareFilter`: [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter), `key`: string, `revision`: number): *Promise‹[RevisionNameFilter](_fs_protocol_private_namefilter_.md#revisionnamefilter)›*

*Defined in [src/fs/protocol/private/namefilter.ts:46](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L46)*

**Parameters:**

Name | Type |
------ | ------ |
`bareFilter` | [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter) |
`key` | string |
`revision` | number |

**Returns:** *Promise‹[RevisionNameFilter](_fs_protocol_private_namefilter_.md#revisionnamefilter)›*

___

### `Const` addToBare

▸ **addToBare**(`bareFilter`: [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter), `toAdd`: string): *Promise‹[BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter)›*

*Defined in [src/fs/protocol/private/namefilter.ts:38](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`bareFilter` | [BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter) |
`toAdd` | string |

**Returns:** *Promise‹[BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter)›*

___

### `Const` createBare

▸ **createBare**(`key`: string): *Promise‹[BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter)›*

*Defined in [src/fs/protocol/private/namefilter.ts:32](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L32)*

**Parameters:**

Name | Type |
------ | ------ |
`key` | string |

**Returns:** *Promise‹[BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter)›*

___

### `Const` fromHex

▸ **fromHex**(`string`: string): *BloomFilter*

*Defined in [src/fs/protocol/private/namefilter.ts:108](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L108)*

**Parameters:**

Name | Type |
------ | ------ |
`string` | string |

**Returns:** *BloomFilter*

___

### `Const` saturate

▸ **saturate**(`filter`: [RevisionNameFilter](_fs_protocol_private_namefilter_.md#revisionnamefilter), `threshold`: number): *Promise‹[SaturatedNameFilter](_fs_protocol_private_namefilter_.md#saturatednamefilter)›*

*Defined in [src/fs/protocol/private/namefilter.ts:63](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L63)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`filter` | [RevisionNameFilter](_fs_protocol_private_namefilter_.md#revisionnamefilter) | - |
`threshold` | number | SATURATION_THRESHOLD |

**Returns:** *Promise‹[SaturatedNameFilter](_fs_protocol_private_namefilter_.md#saturatednamefilter)›*

___

### `Const` toHash

▸ **toHash**(`filter`: BloomFilter): *Promise‹[PrivateName](_fs_protocol_private_namefilter_.md#privatename)›*

*Defined in [src/fs/protocol/private/namefilter.ts:57](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L57)*

**Parameters:**

Name | Type |
------ | ------ |
`filter` | BloomFilter |

**Returns:** *Promise‹[PrivateName](_fs_protocol_private_namefilter_.md#privatename)›*

___

### `Const` toHex

▸ **toHex**(`filter`: BloomFilter): *string*

*Defined in [src/fs/protocol/private/namefilter.ts:103](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L103)*

**Parameters:**

Name | Type |
------ | ------ |
`filter` | BloomFilter |

**Returns:** *string*

___

### `Const` toPrivateName

▸ **toPrivateName**(`revisionFilter`: [RevisionNameFilter](_fs_protocol_private_namefilter_.md#revisionnamefilter)): *Promise‹[PrivateName](_fs_protocol_private_namefilter_.md#privatename)›*

*Defined in [src/fs/protocol/private/namefilter.ts:51](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/namefilter.ts#L51)*

**Parameters:**

Name | Type |
------ | ------ |
`revisionFilter` | [RevisionNameFilter](_fs_protocol_private_namefilter_.md#revisionnamefilter) |

**Returns:** *Promise‹[PrivateName](_fs_protocol_private_namefilter_.md#privatename)›*
