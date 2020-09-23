[Fission SDK](../README.md) › ["fs/v1/PublicFile"](../modules/_fs_v1_publicfile_.md) › [PublicFile](_fs_v1_publicfile_.publicfile.md)

# Class: PublicFile

## Hierarchy

* BaseFile

  ↳ **PublicFile**

## Implements

* File
* File

## Index

### Constructors

* [constructor](_fs_v1_publicfile_.publicfile.md#constructor)

### Properties

* [content](_fs_v1_publicfile_.publicfile.md#content)
* [info](_fs_v1_publicfile_.publicfile.md#info)

### Methods

* [put](_fs_v1_publicfile_.publicfile.md#put)
* [putDetailed](_fs_v1_publicfile_.publicfile.md#putdetailed)
* [create](_fs_v1_publicfile_.publicfile.md#static-create)
* [fromCID](_fs_v1_publicfile_.publicfile.md#static-fromcid)
* [fromInfo](_fs_v1_publicfile_.publicfile.md#static-frominfo)

## Constructors

###  constructor

\+ **new PublicFile**(`__namedParameters`: object): *[PublicFile](_fs_v1_publicfile_.publicfile.md)*

*Overrides void*

*Defined in [src/fs/v1/PublicFile.ts:16](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/v1/PublicFile.ts#L16)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`content` | string &#124; number &#124; false &#124; true &#124; object &#124; Buffer‹› &#124; Blob |
`info` | object |

**Returns:** *[PublicFile](_fs_v1_publicfile_.publicfile.md)*

## Properties

###  content

• **content**: *FileContent*

*Inherited from void*

*Defined in [src/fs/base/file.ts:10](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/base/file.ts#L10)*

___

###  info

• **info**: *[FileHeader](../modules/_fs_protocol_public_types_.md#fileheader)*

*Defined in [src/fs/v1/PublicFile.ts:16](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/v1/PublicFile.ts#L16)*

## Methods

###  put

▸ **put**(): *Promise‹CID›*

*Inherited from void*

*Defined in [src/fs/base/file.ts:16](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/base/file.ts#L16)*

**Returns:** *Promise‹CID›*

___

###  putDetailed

▸ **putDetailed**(): *Promise‹PutDetails›*

*Overrides void*

*Defined in [src/fs/v1/PublicFile.ts:41](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/v1/PublicFile.ts#L41)*

**Returns:** *Promise‹PutDetails›*

___

### `Static` create

▸ **create**(`content`: FileContent): *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*

*Defined in [src/fs/v1/PublicFile.ts:23](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/v1/PublicFile.ts#L23)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |

**Returns:** *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID): *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*

*Defined in [src/fs/v1/PublicFile.ts:30](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/v1/PublicFile.ts#L30)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |

**Returns:** *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*

___

### `Static` fromInfo

▸ **fromInfo**(`info`: [FileInfo](../modules/_fs_protocol_public_types_.md#fileinfo)): *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*

*Defined in [src/fs/v1/PublicFile.ts:35](https://github.com/fission-suite/webnative/blob/7fcf931/src/fs/v1/PublicFile.ts#L35)*

**Parameters:**

Name | Type |
------ | ------ |
`info` | [FileInfo](../modules/_fs_protocol_public_types_.md#fileinfo) |

**Returns:** *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*
