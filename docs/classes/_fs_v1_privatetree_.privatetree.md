[Fission SDK](../README.md) › ["fs/v1/PrivateTree"](../modules/_fs_v1_privatetree_.md) › [PrivateTree](_fs_v1_privatetree_.privatetree.md)

# Class: PrivateTree

## Hierarchy

  ↳ [PublicTree](_fs_v1_publictree_.publictree.md)

  ↳ **PrivateTree**

## Implements

* Tree
* HeaderTree

## Index

### Constructors

* [constructor](_fs_v1_privatetree_.privatetree.md#constructor)

### Properties

* [version](_fs_v1_privatetree_.privatetree.md#version)

### Methods

* [add](_fs_v1_privatetree_.privatetree.md#add)
* [addChild](_fs_v1_privatetree_.privatetree.md#addchild)
* [addRecurse](_fs_v1_privatetree_.privatetree.md#addrecurse)
* [cat](_fs_v1_privatetree_.privatetree.md#cat)
* [childFileFromCID](_fs_v1_privatetree_.privatetree.md#childfilefromcid)
* [childTreeFromCID](_fs_v1_privatetree_.privatetree.md#childtreefromcid)
* [childTreeFromHeader](_fs_v1_privatetree_.privatetree.md#childtreefromheader)
* [createChildFile](_fs_v1_privatetree_.privatetree.md#createchildfile)
* [emptyChildTree](_fs_v1_privatetree_.privatetree.md#emptychildtree)
* [findLink](_fs_v1_privatetree_.privatetree.md#findlink)
* [findLinkCID](_fs_v1_privatetree_.privatetree.md#findlinkcid)
* [get](_fs_v1_privatetree_.privatetree.md#get)
* [getDirectChild](_fs_v1_privatetree_.privatetree.md#getdirectchild)
* [getHeader](_fs_v1_privatetree_.privatetree.md#getheader)
* [getLinks](_fs_v1_privatetree_.privatetree.md#getlinks)
* [getOrCreateDirectChild](_fs_v1_privatetree_.privatetree.md#getorcreatedirectchild)
* [ls](_fs_v1_privatetree_.privatetree.md#ls)
* [mkdir](_fs_v1_privatetree_.privatetree.md#mkdir)
* [pathExists](_fs_v1_privatetree_.privatetree.md#pathexists)
* [put](_fs_v1_privatetree_.privatetree.md#put)
* [putWithPins](_fs_v1_privatetree_.privatetree.md#putwithpins)
* [removeDirectChild](_fs_v1_privatetree_.privatetree.md#removedirectchild)
* [rm](_fs_v1_privatetree_.privatetree.md#rm)
* [rmLink](_fs_v1_privatetree_.privatetree.md#rmlink)
* [rmNested](_fs_v1_privatetree_.privatetree.md#rmnested)
* [updateDirectChild](_fs_v1_privatetree_.privatetree.md#updatedirectchild)
* [updateHeader](_fs_v1_privatetree_.privatetree.md#updateheader)
* [updateLink](_fs_v1_privatetree_.privatetree.md#updatelink)
* [updatePins](_fs_v1_privatetree_.privatetree.md#updatepins)
* [empty](_fs_v1_privatetree_.privatetree.md#static-empty)
* [fromCID](_fs_v1_privatetree_.privatetree.md#static-fromcid)
* [fromHeader](_fs_v1_privatetree_.privatetree.md#static-fromheader)
* [instanceOf](_fs_v1_privatetree_.privatetree.md#static-instanceof)

## Constructors

###  constructor

\+ **new PrivateTree**(`header`: HeaderV1, `parentKey`: string, `ownKey`: string): *[PrivateTree](_fs_v1_privatetree_.privatetree.md)*

*Overrides [PublicTree](_fs_v1_publictree_.publictree.md).[constructor](_fs_v1_publictree_.publictree.md#constructor)*

*Defined in [src/fs/v1/PrivateTree.ts:13](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PrivateTree.ts#L13)*

**Parameters:**

Name | Type |
------ | ------ |
`header` | HeaderV1 |
`parentKey` | string |
`ownKey` | string |

**Returns:** *[PrivateTree](_fs_v1_privatetree_.privatetree.md)*

## Properties

###  version

• **version**: *SemVer*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[version](_fs_v1_publictree_.publictree.md#version)*

*Defined in [src/fs/base/tree.ts:12](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L12)*

## Methods

###  add

▸ **add**(`path`: string, `content`: FileContent): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[add](_fs_v1_publictree_.publictree.md#add)*

*Defined in [src/fs/base/tree.ts:47](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L47)*

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

*Defined in [src/fs/base/tree.ts:51](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L51)*

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

*Defined in [src/fs/base/tree.ts:60](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L60)*

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

*Defined in [src/fs/base/tree.ts:37](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L37)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹FileContent›*

___

###  childFileFromCID

▸ **childFileFromCID**(`cid`: CID): *Promise‹HeaderFile›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[childFileFromCID](_fs_v1_publictree_.publictree.md#childfilefromcid)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:67](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L67)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |

**Returns:** *Promise‹HeaderFile›*

___

###  childTreeFromCID

▸ **childTreeFromCID**(`cid`: CID): *Promise‹HeaderTree›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[childTreeFromCID](_fs_v1_publictree_.publictree.md#childtreefromcid)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:55](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |

**Returns:** *Promise‹HeaderTree›*

___

###  childTreeFromHeader

▸ **childTreeFromHeader**(`header`: HeaderV1): *HeaderTree*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[childTreeFromHeader](_fs_v1_publictree_.publictree.md#childtreefromheader)*

*Defined in [src/fs/v1/PublicTree.ts:59](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L59)*

**Parameters:**

Name | Type |
------ | ------ |
`header` | HeaderV1 |

**Returns:** *HeaderTree*

___

###  createChildFile

▸ **createChildFile**(`content`: FileContent): *Promise‹HeaderFile›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[createChildFile](_fs_v1_publictree_.publictree.md#createchildfile)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:63](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L63)*

**Parameters:**

Name | Type |
------ | ------ |
`content` | FileContent |

**Returns:** *Promise‹HeaderFile›*

___

###  emptyChildTree

▸ **emptyChildTree**(): *Promise‹HeaderTree›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[emptyChildTree](_fs_v1_publictree_.publictree.md#emptychildtree)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:51](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L51)*

**Returns:** *Promise‹HeaderTree›*

___

###  findLink

▸ **findLink**(`name`: string): *NodeInfo | null*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[findLink](_fs_v1_publictree_.publictree.md#findlink)*

*Defined in [src/fs/v1/PublicTree.ts:156](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L156)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *NodeInfo | null*

___

###  findLinkCID

▸ **findLinkCID**(`name`: string): *CID | null*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[findLinkCID](_fs_v1_publictree_.publictree.md#findlinkcid)*

*Defined in [src/fs/v1/PublicTree.ts:160](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L160)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *CID | null*

___

###  get

▸ **get**(`path`: string): *Promise‹Tree | File | null›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[get](_fs_v1_publictree_.publictree.md#get)*

*Defined in [src/fs/base/tree.ts:111](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L111)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹Tree | File | null›*

___

###  getDirectChild

▸ **getDirectChild**(`name`: string): *Promise‹HeaderTree | HeaderFile | null›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[getDirectChild](_fs_v1_publictree_.publictree.md#getdirectchild)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:111](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L111)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹HeaderTree | HeaderFile | null›*

___

###  getHeader

▸ **getHeader**(): *HeaderV1*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[getHeader](_fs_v1_publictree_.publictree.md#getheader)*

*Defined in [src/fs/v1/PublicTree.ts:176](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L176)*

**Returns:** *HeaderV1*

___

###  getLinks

▸ **getLinks**(): *Links*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[getLinks](_fs_v1_publictree_.publictree.md#getlinks)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:172](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L172)*

**Returns:** *Links*

___

###  getOrCreateDirectChild

▸ **getOrCreateDirectChild**(`name`: string): *Promise‹HeaderTree | HeaderFile›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[getOrCreateDirectChild](_fs_v1_publictree_.publictree.md#getorcreatedirectchild)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:119](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L119)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹HeaderTree | HeaderFile›*

___

###  ls

▸ **ls**(`path`: string): *Promise‹Links›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[ls](_fs_v1_publictree_.publictree.md#ls)*

*Defined in [src/fs/base/tree.ts:18](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L18)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹Links›*

___

###  mkdir

▸ **mkdir**(`path`: string): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[mkdir](_fs_v1_publictree_.publictree.md#mkdir)*

*Defined in [src/fs/base/tree.ts:28](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L28)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹this›*

___

###  pathExists

▸ **pathExists**(`path`: string): *Promise‹boolean›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[pathExists](_fs_v1_publictree_.publictree.md#pathexists)*

*Defined in [src/fs/base/tree.ts:106](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L106)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹boolean›*

___

###  put

▸ **put**(): *Promise‹CID›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[put](_fs_v1_publictree_.publictree.md#put)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:71](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L71)*

**Returns:** *Promise‹CID›*

___

###  putWithPins

▸ **putWithPins**(): *Promise‹PutResult›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[putWithPins](_fs_v1_publictree_.publictree.md#putwithpins)*

*Defined in [src/fs/v1/PublicTree.ts:76](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L76)*

**Returns:** *Promise‹PutResult›*

___

###  removeDirectChild

▸ **removeDirectChild**(`name`: string): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[removeDirectChild](_fs_v1_publictree_.publictree.md#removedirectchild)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:105](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L105)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Promise‹this›*

___

###  rm

▸ **rm**(`path`: string): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[rm](_fs_v1_publictree_.publictree.md#rm)*

*Defined in [src/fs/base/tree.ts:83](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L83)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹this›*

___

###  rmLink

▸ **rmLink**(`name`: string): *Tree*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[rmLink](_fs_v1_publictree_.publictree.md#rmlink)*

*Defined in [src/fs/v1/PublicTree.ts:164](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L164)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *Tree*

___

###  rmNested

▸ **rmNested**(`path`: NonEmptyPath): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[rmNested](_fs_v1_publictree_.publictree.md#rmnested)*

*Defined in [src/fs/base/tree.ts:91](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/base/tree.ts#L91)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | NonEmptyPath |

**Returns:** *Promise‹this›*

___

###  updateDirectChild

▸ **updateDirectChild**(`child`: HeaderTree | HeaderFile, `name`: string): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[updateDirectChild](_fs_v1_publictree_.publictree.md#updatedirectchild)*

*Overrides void*

*Defined in [src/fs/v1/PublicTree.ts:94](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L94)*

**Parameters:**

Name | Type |
------ | ------ |
`child` | HeaderTree &#124; HeaderFile |
`name` | string |

**Returns:** *Promise‹this›*

___

###  updateHeader

▸ **updateHeader**(`name`: string, `childInfo`: Maybe‹NodeInfo›): *Promise‹this›*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[updateHeader](_fs_v1_publictree_.publictree.md#updateheader)*

*Defined in [src/fs/v1/PublicTree.ts:124](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L124)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`childInfo` | Maybe‹NodeInfo› |

**Returns:** *Promise‹this›*

___

###  updateLink

▸ **updateLink**(`info`: NodeInfo): *Tree*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[updateLink](_fs_v1_publictree_.publictree.md#updatelink)*

*Defined in [src/fs/v1/PublicTree.ts:145](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L145)*

**Parameters:**

Name | Type |
------ | ------ |
`info` | NodeInfo |

**Returns:** *Tree*

___

###  updatePins

▸ **updatePins**(`name`: string, `pins`: Maybe‹PinMap›): *this*

*Inherited from [PublicTree](_fs_v1_publictree_.publictree.md).[updatePins](_fs_v1_publictree_.publictree.md#updatepins)*

*Defined in [src/fs/v1/PublicTree.ts:140](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PublicTree.ts#L140)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`pins` | Maybe‹PinMap› |

**Returns:** *this*

___

### `Static` empty

▸ **empty**(`parentKey`: string, `ownKey?`: undefined | string): *Promise‹HeaderTree›*

*Overrides [PublicTree](_fs_v1_publictree_.publictree.md).[empty](_fs_v1_publictree_.publictree.md#static-empty)*

*Defined in [src/fs/v1/PrivateTree.ts:25](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PrivateTree.ts#L25)*

**Parameters:**

Name | Type |
------ | ------ |
`parentKey` | string |
`ownKey?` | undefined &#124; string |

**Returns:** *Promise‹HeaderTree›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID, `parentKey`: string): *Promise‹HeaderTree›*

*Overrides [PublicTree](_fs_v1_publictree_.publictree.md).[fromCID](_fs_v1_publictree_.publictree.md#static-fromcid)*

*Defined in [src/fs/v1/PrivateTree.ts:37](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PrivateTree.ts#L37)*

**Parameters:**

Name | Type |
------ | ------ |
`cid` | CID |
`parentKey` | string |

**Returns:** *Promise‹HeaderTree›*

___

### `Static` fromHeader

▸ **fromHeader**(`header`: HeaderV1, `parentKey`: string): *HeaderTree*

*Overrides [PublicTree](_fs_v1_publictree_.publictree.md).[fromHeader](_fs_v1_publictree_.publictree.md#static-fromheader)*

*Defined in [src/fs/v1/PrivateTree.ts:44](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PrivateTree.ts#L44)*

**Parameters:**

Name | Type |
------ | ------ |
`header` | HeaderV1 |
`parentKey` | string |

**Returns:** *HeaderTree*

___

### `Static` instanceOf

▸ **instanceOf**(`obj`: any): *obj is PrivateTree*

*Overrides [PublicTree](_fs_v1_publictree_.publictree.md).[instanceOf](_fs_v1_publictree_.publictree.md#static-instanceof)*

*Defined in [src/fs/v1/PrivateTree.ts:50](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/fs/v1/PrivateTree.ts#L50)*

**Parameters:**

Name | Type |
------ | ------ |
`obj` | any |

**Returns:** *obj is PrivateTree*
