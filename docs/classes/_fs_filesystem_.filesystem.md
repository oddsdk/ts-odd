[Fission SDK](../README.md) › ["fs/filesystem"](../modules/_fs_filesystem_.md) › [FileSystem](_fs_filesystem_.filesystem.md)

# Class: FileSystem

## Hierarchy

* **FileSystem**

## Index

### Constructors

* [constructor](_fs_filesystem_.filesystem.md#constructor)

### Properties

* [prettyTree](_fs_filesystem_.filesystem.md#prettytree)
* [privateTree](_fs_filesystem_.filesystem.md#privatetree)
* [publicTree](_fs_filesystem_.filesystem.md#publictree)
* [root](_fs_filesystem_.filesystem.md#root)
* [syncHooks](_fs_filesystem_.filesystem.md#synchooks)
* [syncWhenOnline](_fs_filesystem_.filesystem.md#syncwhenonline)

### Methods

* [add](_fs_filesystem_.filesystem.md#add)
* [cat](_fs_filesystem_.filesystem.md#cat)
* [deactivate](_fs_filesystem_.filesystem.md#deactivate)
* [get](_fs_filesystem_.filesystem.md#get)
* [ls](_fs_filesystem_.filesystem.md#ls)
* [mkdir](_fs_filesystem_.filesystem.md#mkdir)
* [mv](_fs_filesystem_.filesystem.md#mv)
* [pinList](_fs_filesystem_.filesystem.md#pinlist)
* [rm](_fs_filesystem_.filesystem.md#rm)
* [sync](_fs_filesystem_.filesystem.md#sync)
* [empty](_fs_filesystem_.filesystem.md#static-empty)
* [forUser](_fs_filesystem_.filesystem.md#static-foruser)
* [fromCID](_fs_filesystem_.filesystem.md#static-fromcid)
* [upgradePublicCID](_fs_filesystem_.filesystem.md#static-upgradepubliccid)

## Constructors

###  constructor

\+ **new FileSystem**(`__namedParameters`: object): *[FileSystem](_fs_filesystem_.filesystem.md)*

*Defined in [src/fs/filesystem.ts:32](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L32)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`prettyTree` | BareTree‹› |
`privateTree` | HeaderTree‹› |
`publicTree` | HeaderTree‹› |
`root` | Tree‹› |

**Returns:** *[FileSystem](_fs_filesystem_.filesystem.md)*

## Properties

###  prettyTree

• **prettyTree**: *PublicTreeBare*

*Defined in [src/fs/filesystem.ts:28](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L28)*

___

###  privateTree

• **privateTree**: *HeaderTree*

*Defined in [src/fs/filesystem.ts:29](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L29)*

___

###  publicTree

• **publicTree**: *HeaderTree*

*Defined in [src/fs/filesystem.ts:27](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L27)*

___

###  root

• **root**: *Tree*

*Defined in [src/fs/filesystem.ts:26](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L26)*

___

###  syncHooks

• **syncHooks**: *Array‹SyncHook›*

*Defined in [src/fs/filesystem.ts:31](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L31)*

___

###  syncWhenOnline

• **syncWhenOnline**: *CID | null*

*Defined in [src/fs/filesystem.ts:32](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L32)*

## Methods

###  add

▸ **add**(`path`: string, `content`: FileContent): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:160](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L160)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`content` | FileContent |

**Returns:** *Promise‹CID›*

___

###  cat

▸ **cat**(`path`: string): *Promise‹FileContent | null›*

*Defined in [src/fs/filesystem.ts:167](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L167)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹FileContent | null›*

___

###  deactivate

▸ **deactivate**(): *void*

*Defined in [src/fs/filesystem.ts:138](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L138)*

**Returns:** *void*

___

###  get

▸ **get**(`path`: string): *Promise‹Tree | File | null›*

*Defined in [src/fs/filesystem.ts:180](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L180)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹Tree | File | null›*

___

###  ls

▸ **ls**(`path`: string): *Promise‹Links›*

*Defined in [src/fs/filesystem.ts:147](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L147)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹Links›*

___

###  mkdir

▸ **mkdir**(`path`: string): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:153](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L153)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹CID›*

___

###  mv

▸ **mv**(`from`: string, `to`: string): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:186](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L186)*

**Parameters:**

Name | Type |
------ | ------ |
`from` | string |
`to` | string |

**Returns:** *Promise‹CID›*

___

###  pinList

▸ **pinList**(): *Promise‹CID[]›*

*Defined in [src/fs/filesystem.ts:209](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L209)*

Retrieves an array of all CIDs that need to be pinned in order to backup the FS.

**Returns:** *Promise‹CID[]›*

___

###  rm

▸ **rm**(`path`: string): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:173](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L173)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹CID›*

___

###  sync

▸ **sync**(): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:223](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L223)*

Ensures the latest version of the file system is added to IPFS and returns the root CID.

**Returns:** *Promise‹CID›*

___

### `Static` empty

▸ **empty**(`opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*

*Defined in [src/fs/filesystem.ts:61](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L61)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*

___

### `Static` forUser

▸ **forUser**(`username`: string, `opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*

*Defined in [src/fs/filesystem.ts:107](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L107)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`username` | string | - |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID, `opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*

*Defined in [src/fs/filesystem.ts:79](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L79)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`cid` | CID | - |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*

___

### `Static` upgradePublicCID

▸ **upgradePublicCID**(`cid`: CID, `opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*

*Defined in [src/fs/filesystem.ts:115](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/fs/filesystem.ts#L115)*

Upgrade public IPFS folder to FileSystem

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`cid` | CID | - |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*
