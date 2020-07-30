[Fission SDK](../README.md) › ["fs/v1/PrivateFile"](../modules/_fs_v1_privatefile_.md) › [PrivateFile](_fs_v1_privatefile_.privatefile.md)

# Class: PrivateFile

## Hierarchy

  ↳ [PublicFile](_fs_v1_publicfile_.publicfile.md)

  ↳ **PrivateFile**

## Implements

* File
* HeaderFile

## Index

### Constructors

* [constructor](_fs_v1_privatefile_.privatefile.md#constructor)

### Properties

* [content](_fs_v1_privatefile_.privatefile.md#content)
* [parentKey](_fs_v1_privatefile_.privatefile.md#parentkey)

### Methods

* [getHeader](_fs_v1_privatefile_.privatefile.md#getheader)
* [put](_fs_v1_privatefile_.privatefile.md#put)
* [putWithPins](_fs_v1_privatefile_.privatefile.md#putwithpins)
* [create](_fs_v1_privatefile_.privatefile.md#static-create)
* [fromCID](_fs_v1_privatefile_.privatefile.md#static-fromcid)

## Constructors

###  constructor

\+ **new PrivateFile**(`content`: FileContent, `header`: HeaderV1, `parentKey`: string): *[PrivateFile](_fs_v1_privatefile_.privatefile.md)*

*Overrides [PublicFile](_fs_v1_publicfile_.publicfile.md).[constructor](_fs_v1_publicfile_.publicfile.md#constructor)*

*Defined in [src/fs/v1/PrivateFile.ts:11](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PrivateFile.ts#L11)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |
`header` | HeaderV1 |
`parentKey` | string |

**Returns:** *[PrivateFile](_fs_v1_privatefile_.privatefile.md)*

## Properties

###  content

• **content**: *FileContent*

*Inherited from void*

*Defined in [src/fs/base/file.ts:10](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/base/file.ts#L10)*

___

###  parentKey

• **parentKey**: *string*

*Overrides void*

*Defined in [src/fs/v1/PrivateFile.ts:11](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PrivateFile.ts#L11)*

## Methods

###  getHeader

▸ **getHeader**(): *HeaderV1*

*Inherited from [PublicFile](_fs_v1_publicfile_.publicfile.md).[getHeader](_fs_v1_publicfile_.publicfile.md#getheader)*

*Defined in [src/fs/v1/PublicFile.ts:54](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L54)*

**Returns:** *HeaderV1*

___

###  put

▸ **put**(): *Promise‹CID›*

*Inherited from [PublicFile](_fs_v1_publicfile_.publicfile.md).[put](_fs_v1_publicfile_.publicfile.md#put)*

*Overrides void*

*Defined in [src/fs/v1/PublicFile.ts:36](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PublicFile.ts#L36)*

**Returns:** *Promise‹CID›*

___

###  putWithPins

▸ **putWithPins**(): *Promise‹PutResult›*

*Overrides [PublicFile](_fs_v1_publicfile_.publicfile.md).[putWithPins](_fs_v1_publicfile_.publicfile.md#putwithpins)*

*Defined in [src/fs/v1/PrivateFile.ts:36](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PrivateFile.ts#L36)*

**Returns:** *Promise‹PutResult›*

___

### `Static` create

▸ **create**(`content`: FileContent, `parentKey`: string, `ownKey?`: undefined | string): *Promise‹HeaderFile›*

*Overrides [PublicFile](_fs_v1_publicfile_.publicfile.md).[create](_fs_v1_publicfile_.publicfile.md#static-create)*

*Defined in [src/fs/v1/PrivateFile.ts:18](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PrivateFile.ts#L18)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |
`parentKey` | string |
`ownKey?` | undefined &#124; string |

**Returns:** *Promise‹HeaderFile›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID, `parentKey`: string): *Promise‹HeaderFile›*

*Overrides [PublicFile](_fs_v1_publicfile_.publicfile.md).[fromCID](_fs_v1_publicfile_.publicfile.md#static-fromcid)*

*Defined in [src/fs/v1/PrivateFile.ts:30](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/PrivateFile.ts#L30)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |
`parentKey` | string |

**Returns:** *Promise‹HeaderFile›*
