[Fission SDK](../README.md) › ["fs/v1/header"](_fs_v1_header_.md)

# Module: "fs/v1/header"

## Index

### Variables

* [values](_fs_v1_header_.md#const-values)

### Functions

* [empty](_fs_v1_header_.md#const-empty)
* [getHeaderAndIndex](_fs_v1_header_.md#const-getheaderandindex)
* [parseAndCheck](_fs_v1_header_.md#const-parseandcheck)

## Variables

### `Const` values

• **values**: *string[]* = ['name', 'isFile', 'mtime', 'size', 'version', 'key', 'fileIndex', 'pins']

*Defined in [src/fs/v1/header.ts:9](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/header.ts#L9)*

## Functions

### `Const` empty

▸ **empty**(): *HeaderV1*

*Defined in [src/fs/v1/header.ts:11](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/header.ts#L11)*

**Returns:** *HeaderV1*

___

### `Const` getHeaderAndIndex

▸ **getHeaderAndIndex**(`cid`: CID, `parentKey`: Maybe‹string›): *Promise‹Result›*

*Defined in [src/fs/v1/header.ts:27](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/header.ts#L27)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |
`parentKey` | Maybe‹string› |

**Returns:** *Promise‹Result›*

___

### `Const` parseAndCheck

▸ **parseAndCheck**(`decoded`: UnstructuredHeader): *HeaderV1*

*Defined in [src/fs/v1/header.ts:34](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/v1/header.ts#L34)*

**Parameters:**

Name | Type |
------ | ------ |
`decoded` | UnstructuredHeader |

**Returns:** *HeaderV1*
