[Fission SDK](../README.md) › ["fs/bare/file"](../modules/_fs_bare_file_.md) › [BareFile](_fs_bare_file_.barefile.md)

# Class: BareFile

## Hierarchy

* BaseFile

  ↳ **BareFile**

## Implements

* File

## Index

### Constructors

* [constructor](_fs_bare_file_.barefile.md#constructor)

### Properties

* [content](_fs_bare_file_.barefile.md#content)

### Methods

* [put](_fs_bare_file_.barefile.md#put)
* [putDetailed](_fs_bare_file_.barefile.md#putdetailed)
* [create](_fs_bare_file_.barefile.md#static-create)
* [fromCID](_fs_bare_file_.barefile.md#static-fromcid)

## Constructors

###  constructor

\+ **new BareFile**(`content`: FileContent): *[BareFile](_fs_bare_file_.barefile.md)*

*Inherited from void*

*Defined in [src/fs/base/file.ts:10](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/base/file.ts#L10)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |

**Returns:** *[BareFile](_fs_bare_file_.barefile.md)*

## Properties

###  content

• **content**: *FileContent*

*Inherited from void*

*Defined in [src/fs/base/file.ts:10](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/base/file.ts#L10)*

## Methods

###  put

▸ **put**(): *Promise‹CID›*

*Overrides void*

*Defined in [src/fs/bare/file.ts:17](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/bare/file.ts#L17)*

**Returns:** *Promise‹CID›*

___

###  putDetailed

▸ **putDetailed**(): *Promise‹AddResult›*

*Overrides void*

*Defined in [src/fs/bare/file.ts:22](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/bare/file.ts#L22)*

**Returns:** *Promise‹AddResult›*

___

### `Static` create

▸ **create**(`content`: FileContent): *[BareFile](_fs_bare_file_.barefile.md)*

*Defined in [src/fs/bare/file.ts:8](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/bare/file.ts#L8)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |

**Returns:** *[BareFile](_fs_bare_file_.barefile.md)*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID): *Promise‹[BareFile](_fs_bare_file_.barefile.md)›*

*Defined in [src/fs/bare/file.ts:12](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/bare/file.ts#L12)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |

**Returns:** *Promise‹[BareFile](_fs_bare_file_.barefile.md)›*
