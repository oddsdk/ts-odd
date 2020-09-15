[Fission SDK](../README.md) › ["fs/v1/PublicTree"](../modules/_fs_v1_publictree_.md) › [PublicTree](_fs_v1_publictree_.publictree.md)

# Class: PublicTree

## Hierarchy

* BaseTree

  ↳ **PublicTree**

## Implements

* Tree
* UnixTree

## Index

### Constructors

* [constructor](_fs_v1_publictree_.publictree.md#constructor)

### Properties

* [info](_fs_v1_publictree_.publictree.md#info)
* [links](_fs_v1_publictree_.publictree.md#links)
* [onUpdate](_fs_v1_publictree_.publictree.md#onupdate)
* [version](_fs_v1_publictree_.publictree.md#version)

### Methods

* [add](_fs_v1_publictree_.publictree.md#add)
* [addChild](_fs_v1_publictree_.publictree.md#addchild)
* [addRecurse](_fs_v1_publictree_.publictree.md#addrecurse)
* [cat](_fs_v1_publictree_.publictree.md#cat)
* [createChildFile](_fs_v1_publictree_.publictree.md#createchildfile)
* [emptyChildTree](_fs_v1_publictree_.publictree.md#emptychildtree)
* [exists](_fs_v1_publictree_.publictree.md#exists)
* [get](_fs_v1_publictree_.publictree.md#get)
* [getDirectChild](_fs_v1_publictree_.publictree.md#getdirectchild)
* [getLinks](_fs_v1_publictree_.publictree.md#getlinks)
* [getOrCreateDirectChild](_fs_v1_publictree_.publictree.md#getorcreatedirectchild)
* [ls](_fs_v1_publictree_.publictree.md#ls)
* [mkdir](_fs_v1_publictree_.publictree.md#mkdir)
* [mv](_fs_v1_publictree_.publictree.md#mv)
* [put](_fs_v1_publictree_.publictree.md#put)
* [putDetailed](_fs_v1_publictree_.publictree.md#putdetailed)
* [removeDirectChild](_fs_v1_publictree_.publictree.md#removedirectchild)
* [rm](_fs_v1_publictree_.publictree.md#rm)
* [rmNested](_fs_v1_publictree_.publictree.md#rmnested)
* [updateDirectChild](_fs_v1_publictree_.publictree.md#updatedirectchild)
* [empty](_fs_v1_publictree_.publictree.md#static-empty)
* [fromCID](_fs_v1_publictree_.publictree.md#static-fromcid)
* [fromInfo](_fs_v1_publictree_.publictree.md#static-frominfo)
* [instanceOf](_fs_v1_publictree_.publictree.md#static-instanceof)

## Constructors

###  constructor

\+ **new PublicTree**(`__namedParameters`: object): *[PublicTree](_fs_v1_publictree_.publictree.md)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:24](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L24)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`info` | object |
`links` | object |

**Returns:** *[PublicTree](_fs_v1_publictree_.publictree.md)*

## Properties

###  info

• **info**: *[TreeHeader](../modules/_fs_protocol_public_types_.md#treeheader)*

*Defined in [src/fs/v1/PublicTree.ts:22](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L22)*

___

###  links

• **links**: *Links*

*Defined in [src/fs/v1/PublicTree.ts:21](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L21)*

___

###  onUpdate

• **onUpdate**: *Maybe‹SyncHookDetailed›* = null

*Defined in [src/fs/v1/PublicTree.ts:24](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L24)*

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

▸ **createChildFile**(`content`: FileContent): *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:64](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L64)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |

**Returns:** *Promise‹[PublicFile](_fs_v1_publicfile_.publicfile.md)›*

___

###  emptyChildTree

▸ **emptyChildTree**(): *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:60](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L60)*

**Returns:** *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

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

▸ **get**(`path`: string): *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md) | [PublicFile](_fs_v1_publicfile_.publicfile.md) | null›*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:112](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L112)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md) | [PublicFile](_fs_v1_publicfile_.publicfile.md) | null›*

___

###  getDirectChild

▸ **getDirectChild**(`name`: string): *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md) | [PublicFile](_fs_v1_publicfile_.publicfile.md) | null›*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:99](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L99)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md) | [PublicFile](_fs_v1_publicfile_.publicfile.md) | null›*

___

###  getLinks

▸ **getLinks**(): *Links*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:125](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L125)*

**Returns:** *Links*

___

###  getOrCreateDirectChild

▸ **getOrCreateDirectChild**(`name`: string): *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md) | [PublicFile](_fs_v1_publicfile_.publicfile.md)›*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:107](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L107)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md) | [PublicFile](_fs_v1_publicfile_.publicfile.md)›*

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

▸ **putDetailed**(): *Promise‹PutDetails›*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:68](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L68)*

**Returns:** *Promise‹PutDetails›*

___

###  removeDirectChild

▸ **removeDirectChild**(`name`: string): *this*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:93](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L93)*

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

▸ **updateDirectChild**(`child`: [PublicTree](_fs_v1_publictree_.publictree.md) | [PublicFile](_fs_v1_publicfile_.publicfile.md), `name`: string): *Promise‹this›*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:80](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L80)*

**Parameters:**

Name | Type |
------ | ------ |
`child` | [PublicTree](_fs_v1_publictree_.publictree.md) &#124; [PublicFile](_fs_v1_publicfile_.publicfile.md) |
`name` | string |

**Returns:** *Promise‹this›*

___

### `Static` empty

▸ **empty**(): *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

*Defined in [src/fs/v1/PublicTree.ts:32](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L32)*

**Returns:** *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID): *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

*Defined in [src/fs/v1/PublicTree.ts:42](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L42)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |

**Returns:** *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

___

### `Static` fromInfo

▸ **fromInfo**(`info`: [TreeInfo](../modules/_fs_protocol_public_types_.md#treeinfo)): *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

*Defined in [src/fs/v1/PublicTree.ts:50](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L50)*

**Parameters:**

Name | Type |
------ | ------ |
`info` | [TreeInfo](../modules/_fs_protocol_public_types_.md#treeinfo) |

**Returns:** *Promise‹[PublicTree](_fs_v1_publictree_.publictree.md)›*

___

### `Static` instanceOf

▸ **instanceOf**(`obj`: any): *obj is PublicTree*

*Defined in [src/fs/v1/PublicTree.ts:56](https://github.com/fission-suite/webnative/blob/d222548/src/fs/v1/PublicTree.ts#L56)*

**Parameters:**

Name | Type |
------ | ------ |
`obj` | any |

**Returns:** *obj is PublicTree*
