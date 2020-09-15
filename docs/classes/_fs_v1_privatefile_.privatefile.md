[Fission SDK](../README.md) › ["fs/v1/PrivateFile"](../modules/_fs_v1_privatefile_.md) › [PrivateFile](_fs_v1_privatefile_.privatefile.md)

# Class: PrivateFile

## Hierarchy

* BaseFile

  ↳ **PrivateFile**

## Implements

* File
* File

## Index

### Constructors

* [constructor](_fs_v1_privatefile_.privatefile.md#constructor)

### Properties

* [content](_fs_v1_privatefile_.privatefile.md#content)
* [info](_fs_v1_privatefile_.privatefile.md#info)
* [mmpt](_fs_v1_privatefile_.privatefile.md#mmpt)

### Methods

* [getName](_fs_v1_privatefile_.privatefile.md#getname)
* [put](_fs_v1_privatefile_.privatefile.md#put)
* [putDetailed](_fs_v1_privatefile_.privatefile.md#putdetailed)
* [updateParentNameFilter](_fs_v1_privatefile_.privatefile.md#updateparentnamefilter)
* [create](_fs_v1_privatefile_.privatefile.md#static-create)
* [fromInfo](_fs_v1_privatefile_.privatefile.md#static-frominfo)
* [fromName](_fs_v1_privatefile_.privatefile.md#static-fromname)
* [instanceOf](_fs_v1_privatefile_.privatefile.md#static-instanceof)

## Constructors

###  constructor

\+ **new PrivateFile**(`__namedParameters`: object): *[PrivateFile](_fs_v1_privatefile_.privatefile.md)*

*Overrides void*

*Defined in [src/fs/v1/PrivateFile.ts:23](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L23)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`content` | string &#124; number &#124; false &#124; true &#124; object &#124; Buffer‹› &#124; Blob |
`info` | object |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md)‹› |

**Returns:** *[PrivateFile](_fs_v1_privatefile_.privatefile.md)*

## Properties

###  content

• **content**: *FileContent*

*Inherited from void*

*Defined in [src/fs/base/file.ts:10](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/file.ts#L10)*

___

###  info

• **info**: *[PrivateFileInfo](../modules/_fs_protocol_private_types_.md#privatefileinfo)*

*Defined in [src/fs/v1/PrivateFile.ts:23](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L23)*

___

###  mmpt

• **mmpt**: *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

*Defined in [src/fs/v1/PrivateFile.ts:22](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L22)*

## Methods

###  getName

▸ **getName**(): *Promise‹[PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename)›*

*Defined in [src/fs/v1/PrivateFile.ts:72](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L72)*

**Returns:** *Promise‹[PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename)›*

___

###  put

▸ **put**(): *Promise‹CID›*

*Inherited from void*

*Defined in [src/fs/base/file.ts:16](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/file.ts#L16)*

**Returns:** *Promise‹CID›*

___

###  putDetailed

▸ **putDetailed**(): *Promise‹[PrivateAddResult](../modules/_fs_protocol_private_types_.md#privateaddresult)›*

*Overrides void*

*Defined in [src/fs/v1/PrivateFile.ts:83](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L83)*

**Returns:** *Promise‹[PrivateAddResult](../modules/_fs_protocol_private_types_.md#privateaddresult)›*

___

###  updateParentNameFilter

▸ **updateParentNameFilter**(`parentNameFilter`: [BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter)): *Promise‹this›*

*Defined in [src/fs/v1/PrivateFile.ts:78](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L78)*

**Parameters:**

Name | Type |
------ | ------ |
`parentNameFilter` | [BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter) |

**Returns:** *Promise‹this›*

___

### `Static` create

▸ **create**(`mmpt`: [MMPT](_fs_protocol_private_mmpt_.mmpt.md), `content`: FileContent, `parentNameFilter`: [BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter), `key`: string): *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

*Defined in [src/fs/v1/PrivateFile.ts:38](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md) |
`content` | FileContent |
`parentNameFilter` | [BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter) |
`key` | string |

**Returns:** *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

___

### `Static` fromInfo

▸ **fromInfo**(`mmpt`: [MMPT](_fs_protocol_private_mmpt_.mmpt.md), `info`: [PrivateFileInfo](../modules/_fs_protocol_private_types_.md#privatefileinfo)): *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

*Defined in [src/fs/v1/PrivateFile.ts:63](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L63)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md) |
`info` | [PrivateFileInfo](../modules/_fs_protocol_private_types_.md#privatefileinfo) |

**Returns:** *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

___

### `Static` fromName

▸ **fromName**(`mmpt`: [MMPT](_fs_protocol_private_mmpt_.mmpt.md), `name`: [PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename), `key`: string): *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

*Defined in [src/fs/v1/PrivateFile.ts:54](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L54)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md) |
`name` | [PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename) |
`key` | string |

**Returns:** *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

___

### `Static` instanceOf

▸ **instanceOf**(`obj`: any): *obj is PrivateFile*

*Defined in [src/fs/v1/PrivateFile.ts:31](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateFile.ts#L31)*

**Parameters:**

Name | Type |
------ | ------ |
`obj` | any |

**Returns:** *obj is PrivateFile*
