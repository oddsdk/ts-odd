[Fission SDK](../README.md) › ["fs/filesystem"](../modules/_fs_filesystem_.md) › [FileSystem](_fs_filesystem_.filesystem.md)

# Class: FileSystem

## Hierarchy

* **FileSystem**

## Index

### Constructors

* [constructor](_fs_filesystem_.filesystem.md#constructor)

### Properties

* [appPath](_fs_filesystem_.filesystem.md#apppath)
* [pinsTree](_fs_filesystem_.filesystem.md#pinstree)
* [prettyTree](_fs_filesystem_.filesystem.md#prettytree)
* [privateTree](_fs_filesystem_.filesystem.md#privatetree)
* [publicTree](_fs_filesystem_.filesystem.md#publictree)
* [root](_fs_filesystem_.filesystem.md#root)
* [rootDid](_fs_filesystem_.filesystem.md#rootdid)
* [syncHooks](_fs_filesystem_.filesystem.md#synchooks)
* [syncWhenOnline](_fs_filesystem_.filesystem.md#syncwhenonline)

### Methods

* [add](_fs_filesystem_.filesystem.md#add)
* [cat](_fs_filesystem_.filesystem.md#cat)
* [deactivate](_fs_filesystem_.filesystem.md#deactivate)
* [exists](_fs_filesystem_.filesystem.md#exists)
* [get](_fs_filesystem_.filesystem.md#get)
* [ls](_fs_filesystem_.filesystem.md#ls)
* [mkdir](_fs_filesystem_.filesystem.md#mkdir)
* [mv](_fs_filesystem_.filesystem.md#mv)
* [read](_fs_filesystem_.filesystem.md#read)
* [rm](_fs_filesystem_.filesystem.md#rm)
* [sync](_fs_filesystem_.filesystem.md#sync)
* [updatePinTree](_fs_filesystem_.filesystem.md#updatepintree)
* [write](_fs_filesystem_.filesystem.md#write)
* [empty](_fs_filesystem_.filesystem.md#static-empty)
* [fromCID](_fs_filesystem_.filesystem.md#static-fromcid)

## Constructors

###  constructor

\+ **new FileSystem**(`__namedParameters`: object): *[FileSystem](_fs_filesystem_.filesystem.md)*

*Defined in [src/fs/filesystem.ts:51](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L51)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`pinsTree` | BareTree‹› |
`prettyTree` | BareTree‹› |
`privateTree` | HeaderTree‹› |
`publicTree` | HeaderTree‹› |
`root` | Tree‹› |
`rootDid` | string |

**Returns:** *[FileSystem](_fs_filesystem_.filesystem.md)*

## Properties

###  appPath

• **appPath**: *AppPath*

*Defined in [src/fs/filesystem.ts:49](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L49)*

___

###  pinsTree

• **pinsTree**: *BareTree*

*Defined in [src/fs/filesystem.ts:46](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L46)*

___

###  prettyTree

• **prettyTree**: *BareTree*

*Defined in [src/fs/filesystem.ts:44](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L44)*

___

###  privateTree

• **privateTree**: *HeaderTree*

*Defined in [src/fs/filesystem.ts:45](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L45)*

___

###  publicTree

• **publicTree**: *HeaderTree*

*Defined in [src/fs/filesystem.ts:43](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L43)*

___

###  root

• **root**: *Tree*

*Defined in [src/fs/filesystem.ts:42](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L42)*

___

###  rootDid

• **rootDid**: *string*

*Defined in [src/fs/filesystem.ts:47](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L47)*

___

###  syncHooks

• **syncHooks**: *Array‹SyncHook›*

*Defined in [src/fs/filesystem.ts:50](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L50)*

___

###  syncWhenOnline

• **syncWhenOnline**: *CID | null*

*Defined in [src/fs/filesystem.ts:51](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L51)*

## Methods

###  add

▸ **add**(`path`: string, `content`: FileContent): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:179](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L179)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`content` | FileContent |

**Returns:** *Promise‹CID›*

___

###  cat

▸ **cat**(`path`: string): *Promise‹FileContent | null›*

*Defined in [src/fs/filesystem.ts:186](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L186)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹FileContent | null›*

___

###  deactivate

▸ **deactivate**(): *void*

*Defined in [src/fs/filesystem.ts:170](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L170)*

Deactivate a file system.

Use this when a user signs out.
The only function of this is to stop listing to online/offline events.

**Returns:** *void*

___

###  exists

▸ **exists**(`path`: string): *Promise‹boolean›*

*Defined in [src/fs/filesystem.ts:192](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L192)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹boolean›*

___

###  get

▸ **get**(`path`: string): *Promise‹Tree | File | null›*

*Defined in [src/fs/filesystem.ts:198](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L198)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹Tree | File | null›*

___

###  ls

▸ **ls**(`path`: string): *Promise‹Links›*

*Defined in [src/fs/filesystem.ts:204](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L204)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹Links›*

___

###  mkdir

▸ **mkdir**(`path`: string): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:210](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L210)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹CID›*

___

###  mv

▸ **mv**(`from`: string, `to`: string): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:217](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L217)*

**Parameters:**

Name | Type |
------ | ------ |
`from` | string |
`to` | string |

**Returns:** *Promise‹CID›*

___

###  read

▸ **read**(`path`: string): *Promise‹FileContent | null›*

*Defined in [src/fs/filesystem.ts:232](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L232)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹FileContent | null›*

___

###  rm

▸ **rm**(`path`: string): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:236](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L236)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹CID›*

___

###  sync

▸ **sync**(): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:266](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L266)*

Ensures the latest version of the file system is added to IPFS and returns the root CID.

**Returns:** *Promise‹CID›*

___

###  updatePinTree

▸ **updatePinTree**(`pins`: PinMap): *Promise‹void›*

*Defined in [src/fs/filesystem.ts:256](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L256)*

Retrieves all pins needed for private filesystem and adds them to the 'pin tree'

**Parameters:**

Name | Type |
------ | ------ |
`pins` | PinMap |

**Returns:** *Promise‹void›*

___

###  write

▸ **write**(`path`: string, `content`: FileContent): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:243](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L243)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`content` | FileContent |

**Returns:** *Promise‹CID›*

___

### `Static` empty

▸ **empty**(`opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*

*Defined in [src/fs/filesystem.ts:98](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L98)*

Creates a file system with an empty public tree & an empty private tree at the root.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID, `opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*

*Defined in [src/fs/filesystem.ts:127](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/fs/filesystem.ts#L127)*

Loads an existing file system from a CID.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`cid` | CID | - |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*
