[Fission SDK](../README.md) › ["fs/v1/PrivateTree"](../modules/_fs_v1_privatetree_.md) › [PrivateTree](_fs_v1_privatetree_.privatetree.md)

# Class: PrivateTree

## Hierarchy

* BaseTree

  ↳ **PrivateTree**

## Implements

* Tree
* UnixTree

## Index

### Constructors

* [constructor](_fs_v1_privatetree_.privatetree.md#constructor)

### Properties

* [info](_fs_v1_privatetree_.privatetree.md#info)
* [key](_fs_v1_privatetree_.privatetree.md#key)
* [mmpt](_fs_v1_privatetree_.privatetree.md#mmpt)
* [onUpdate](_fs_v1_privatetree_.privatetree.md#onupdate)
* [version](_fs_v1_privatetree_.privatetree.md#version)

### Methods

* [add](_fs_v1_privatetree_.privatetree.md#add)
* [addChild](_fs_v1_privatetree_.privatetree.md#addchild)
* [addRecurse](_fs_v1_privatetree_.privatetree.md#addrecurse)
* [cat](_fs_v1_privatetree_.privatetree.md#cat)
* [createChildFile](_fs_v1_privatetree_.privatetree.md#createchildfile)
* [emptyChildTree](_fs_v1_privatetree_.privatetree.md#emptychildtree)
* [exists](_fs_v1_privatetree_.privatetree.md#exists)
* [get](_fs_v1_privatetree_.privatetree.md#get)
* [getDirectChild](_fs_v1_privatetree_.privatetree.md#getdirectchild)
* [getLinks](_fs_v1_privatetree_.privatetree.md#getlinks)
* [getName](_fs_v1_privatetree_.privatetree.md#getname)
* [getOrCreateDirectChild](_fs_v1_privatetree_.privatetree.md#getorcreatedirectchild)
* [getRecurse](_fs_v1_privatetree_.privatetree.md#getrecurse)
* [ls](_fs_v1_privatetree_.privatetree.md#ls)
* [mkdir](_fs_v1_privatetree_.privatetree.md#mkdir)
* [mv](_fs_v1_privatetree_.privatetree.md#mv)
* [put](_fs_v1_privatetree_.privatetree.md#put)
* [putDetailed](_fs_v1_privatetree_.privatetree.md#putdetailed)
* [removeDirectChild](_fs_v1_privatetree_.privatetree.md#removedirectchild)
* [rm](_fs_v1_privatetree_.privatetree.md#rm)
* [rmNested](_fs_v1_privatetree_.privatetree.md#rmnested)
* [updateDirectChild](_fs_v1_privatetree_.privatetree.md#updatedirectchild)
* [updateParentNameFilter](_fs_v1_privatetree_.privatetree.md#updateparentnamefilter)
* [create](_fs_v1_privatetree_.privatetree.md#static-create)
* [fromBaseKey](_fs_v1_privatetree_.privatetree.md#static-frombasekey)
* [fromInfo](_fs_v1_privatetree_.privatetree.md#static-frominfo)
* [fromName](_fs_v1_privatetree_.privatetree.md#static-fromname)
* [instanceOf](_fs_v1_privatetree_.privatetree.md#static-instanceof)

## Constructors

###  constructor

\+ **new PrivateTree**(`__namedParameters`: object): *[PrivateTree](_fs_v1_privatetree_.privatetree.md)*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:29](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L29)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`info` | object |
`key` | string |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md)‹› |

**Returns:** *[PrivateTree](_fs_v1_privatetree_.privatetree.md)*

## Properties

###  info

• **info**: *[PrivateTreeInfo](../modules/_fs_protocol_private_types_.md#privatetreeinfo)*

*Defined in [src/fs/v1/PrivateTree.ts:27](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L27)*

___

###  key

• **key**: *string*

*Defined in [src/fs/v1/PrivateTree.ts:26](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L26)*

___

###  mmpt

• **mmpt**: *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

*Defined in [src/fs/v1/PrivateTree.ts:25](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L25)*

___

###  onUpdate

• **onUpdate**: *Maybe‹SyncHookDetailed›* = null

*Defined in [src/fs/v1/PrivateTree.ts:29](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L29)*

___

###  version

• **version**: *SemVer*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[version](_fs_v1_publictree_.publictree.md#version)*

*Defined in [src/fs/base/tree.ts:13](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L13)*

## Methods

###  add

▸ **add**(`path`: string, `content`: FileContent): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[add](_fs_v1_publictree_.publictree.md#add)*

*Defined in [src/fs/base/tree.ts:55](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`content` | FileContent |

**Returns:** *Promise‹this›*

___

###  addChild

▸ **addChild**(`path`: string, `toAdd`: Tree | FileContent): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[addChild](_fs_v1_publictree_.publictree.md#addchild)*

*Defined in [src/fs/base/tree.ts:61](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`toAdd` | Tree &#124; FileContent |

**Returns:** *Promise‹this›*

___

###  addRecurse

▸ **addRecurse**(`path`: NonEmptyPath, `child`: Tree | FileContent): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[addRecurse](_fs_v1_publictree_.publictree.md#addrecurse)*

*Defined in [src/fs/base/tree.ts:70](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L70)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | NonEmptyPath |
`child` | Tree &#124; FileContent |

**Returns:** *Promise‹this›*

___

###  cat

▸ **cat**(`path`: string): *Promise‹FileContent›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[cat](_fs_v1_publictree_.publictree.md#cat)*

*Defined in [src/fs/base/tree.ts:45](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L45)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹FileContent›*

___

###  createChildFile

▸ **createChildFile**(`content`: FileContent): *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:85](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L85)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |

**Returns:** *Promise‹[PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

___

###  emptyChildTree

▸ **emptyChildTree**(): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:80](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L80)*

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

___

###  exists

▸ **exists**(`path`: string): *Promise‹boolean›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[exists](_fs_v1_publictree_.publictree.md#exists)*

*Defined in [src/fs/base/tree.ts:137](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L137)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹boolean›*

___

###  get

▸ **get**(`path`: string): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md) | [PrivateFile](_fs_v1_privatefile_.privatefile.md) | null›*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:153](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L153)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md) | [PrivateFile](_fs_v1_privatefile_.privatefile.md) | null›*

___

###  getDirectChild

▸ **getDirectChild**(`name`: string): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md) | [PrivateFile](_fs_v1_privatefile_.privatefile.md) | null›*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:122](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L122)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md) | [PrivateFile](_fs_v1_privatefile_.privatefile.md) | null›*

___

###  getLinks

▸ **getLinks**(): *BaseLinks*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:146](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L146)*

**Returns:** *BaseLinks*

___

###  getName

▸ **getName**(): *Promise‹[PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename)›*

*Defined in [src/fs/v1/PrivateTree.ts:135](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L135)*

**Returns:** *Promise‹[PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename)›*

___

###  getOrCreateDirectChild

▸ **getOrCreateDirectChild**(`name`: string): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md) | [PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:130](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L130)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md) | [PrivateFile](_fs_v1_privatefile_.privatefile.md)›*

___

###  getRecurse

▸ **getRecurse**(`nodeInfo`: [PrivateSkeletonInfo](../modules/_fs_protocol_private_types_.md#privateskeletoninfo), `parts`: string[]): *Promise‹Maybe‹[DecryptedNode](../modules/_fs_protocol_private_types_.md#decryptednode)››*

*Defined in [src/fs/v1/PrivateTree.ts:170](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L170)*

**Parameters:**

Name | Type |
------ | ------ |
`nodeInfo` | [PrivateSkeletonInfo](../modules/_fs_protocol_private_types_.md#privateskeletoninfo) |
`parts` | string[] |

**Returns:** *Promise‹Maybe‹[DecryptedNode](../modules/_fs_protocol_private_types_.md#decryptednode)››*

___

###  ls

▸ **ls**(`path`: string): *Promise‹BaseLinks›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[ls](_fs_v1_publictree_.publictree.md#ls)*

*Defined in [src/fs/base/tree.ts:24](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L24)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹BaseLinks›*

___

###  mkdir

▸ **mkdir**(`path`: string): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[mkdir](_fs_v1_publictree_.publictree.md#mkdir)*

*Defined in [src/fs/base/tree.ts:34](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L34)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹this›*

___

###  mv

▸ **mv**(`from`: string, `to`: string): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[mv](_fs_v1_publictree_.publictree.md#mv)*

*Defined in [src/fs/base/tree.ts:118](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L118)*

**Parameters:**

Name | Type |
------ | ------ |
`from` | string |
`to` | string |

**Returns:** *Promise‹this›*

___

###  put

▸ **put**(): *Promise‹CID›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[put](_fs_v1_publictree_.publictree.md#put)*

*Defined in [src/fs/base/tree.ts:19](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L19)*

**Returns:** *Promise‹CID›*

___

###  putDetailed

▸ **putDetailed**(): *Promise‹[PrivateAddResult](../modules/_fs_protocol_private_types_.md#privateaddresult)›*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:90](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L90)*

**Returns:** *Promise‹[PrivateAddResult](../modules/_fs_protocol_private_types_.md#privateaddresult)›*

___

###  removeDirectChild

▸ **removeDirectChild**(`name`: string): *this*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:112](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L112)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *this*

___

###  rm

▸ **rm**(`path`: string): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[rm](_fs_v1_publictree_.publictree.md#rm)*

*Defined in [src/fs/base/tree.ts:93](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L93)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹this›*

___

###  rmNested

▸ **rmNested**(`path`: NonEmptyPath): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[rmNested](_fs_v1_publictree_.publictree.md#rmnested)*

*Defined in [src/fs/base/tree.ts:103](https://github.com/fission-suite/webnative/blob/d222548/src/fs/base/tree.ts#L103)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | NonEmptyPath |

**Returns:** *Promise‹this›*

___

###  updateDirectChild

▸ **updateDirectChild**(`child`: [PrivateTree](_fs_v1_privatetree_.privatetree.md) | [PrivateFile](_fs_v1_privatefile_.privatefile.md), `name`: string): *Promise‹this›*

*Overrides void*

*Defined in [src/fs/v1/PrivateTree.ts:102](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L102)*

**Parameters:**

Name | Type |
------ | ------ |
`child` | [PrivateTree](_fs_v1_privatetree_.privatetree.md) &#124; [PrivateFile](_fs_v1_privatefile_.privatefile.md) |
`name` | string |

**Returns:** *Promise‹this›*

___

###  updateParentNameFilter

▸ **updateParentNameFilter**(`parentNameFilter`: [BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter)): *Promise‹this›*

*Defined in [src/fs/v1/PrivateTree.ts:141](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L141)*

**Parameters:**

Name | Type |
------ | ------ |
`parentNameFilter` | [BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter) |

**Returns:** *Promise‹this›*

___

### `Static` create

▸ **create**(`mmpt`: [MMPT](_fs_protocol_private_mmpt_.mmpt.md), `key`: string, `parentNameFilter`: Maybe‹[BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter)›): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

*Defined in [src/fs/v1/PrivateTree.ts:44](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L44)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md) |
`key` | string |
`parentNameFilter` | Maybe‹[BareNameFilter](../modules/_fs_protocol_private_namefilter_.md#barenamefilter)› |

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

___

### `Static` fromBaseKey

▸ **fromBaseKey**(`mmpt`: [MMPT](_fs_protocol_private_mmpt_.mmpt.md), `key`: string): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

*Defined in [src/fs/v1/PrivateTree.ts:61](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md) |
`key` | string |

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

___

### `Static` fromInfo

▸ **fromInfo**(`mmpt`: [MMPT](_fs_protocol_private_mmpt_.mmpt.md), `key`: string, `info`: [PrivateTreeInfo](../modules/_fs_protocol_private_types_.md#privatetreeinfo)): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

*Defined in [src/fs/v1/PrivateTree.ts:76](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L76)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md) |
`key` | string |
`info` | [PrivateTreeInfo](../modules/_fs_protocol_private_types_.md#privatetreeinfo) |

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

___

### `Static` fromName

▸ **fromName**(`mmpt`: [MMPT](_fs_protocol_private_mmpt_.mmpt.md), `name`: [PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename), `key`: string): *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

*Defined in [src/fs/v1/PrivateTree.ts:68](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L68)*

**Parameters:**

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md) |
`name` | [PrivateName](../modules/_fs_protocol_private_namefilter_.md#privatename) |
`key` | string |

**Returns:** *Promise‹[PrivateTree](_fs_v1_privatetree_.privatetree.md)›*

___

### `Static` instanceOf

▸ **instanceOf**(`obj`: any): *obj is PrivateTree*

*Defined in [src/fs/v1/PrivateTree.ts:38](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PrivateTree.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`obj` | any |

**Returns:** *obj is PrivateTree*
