[Fission SDK](../README.md) › ["fs/v1/PublicFile"](../modules/_fs_v1_publicfile_.md) › [PublicFile](_fs_v1_publicfile_.publicfile.md)

# Class: PublicFile

## Hierarchy

* BaseFile

  ↳ **PublicFile**

  ↳ [PrivateFile](_fs_v1_privatefile_.privatefile.md)

## Implements

* File
* HeaderFile

## Index

### Constructors

* [constructor](_fs_v1_publicfile_.publicfile.md#constructor)

### Properties

* [content](_fs_v1_publicfile_.publicfile.md#content)

### Methods

* [getHeader](_fs_v1_publicfile_.publicfile.md#getheader)
* [put](_fs_v1_publicfile_.publicfile.md#put)
* [putWithPins](_fs_v1_publicfile_.publicfile.md#putwithpins)
* [create](_fs_v1_publicfile_.publicfile.md#static-create)
* [fromCID](_fs_v1_publicfile_.publicfile.md#static-fromcid)

## Constructors

###  constructor

\+ **new PublicFile**(`content`: FileContent, `header`: HeaderV1, `parentKey`: Maybe‹string›): *[PublicFile](_fs_v1_publicfile_.publicfile.md)*

*Overrides void*

*Defined in [src/fs/v1/PublicFile.ts:14](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L14)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |
`header` | HeaderV1 |
`parentKey` | Maybe‹string› |

**Returns:** *[PublicFile](_fs_v1_publicfile_.publicfile.md)*

## Properties

###  content

• **content**: *FileContent*

*Inherited from void*

*Defined in [src/fs/base/file.ts:10](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/base/file.ts#L10)*

## Methods

###  getHeader

▸ **getHeader**(): *HeaderV1*

*Defined in [src/fs/v1/PublicFile.ts:54](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L54)*

**Returns:** *HeaderV1*

___

###  put

▸ **put**(): *Promise‹CID›*

*Overrides void*

*Defined in [src/fs/v1/PublicFile.ts:36](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L36)*

**Returns:** *Promise‹CID›*

___

###  putWithPins

▸ **putWithPins**(): *Promise‹PutResult›*

*Defined in [src/fs/v1/PublicFile.ts:41](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L41)*

**Returns:** *Promise‹PutResult›*

___

### `Static` create

▸ **create**(`content`: FileContent, `parentKey`: Maybe‹string›): *Promise‹HeaderFile›*

*Defined in [src/fs/v1/PublicFile.ts:22](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L22)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |
`parentKey` | Maybe‹string› |

**Returns:** *Promise‹HeaderFile›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID, `parentKey`: Maybe‹string›): *Promise‹HeaderFile›*

*Defined in [src/fs/v1/PublicFile.ts:30](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L30)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |
`parentKey` | Maybe‹string› |

**Returns:** *Promise‹HeaderFile›*
