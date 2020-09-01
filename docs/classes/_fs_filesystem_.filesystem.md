[Fission SDK](../README.md) › ["fs/filesystem"](../modules/_fs_filesystem_.md) › [FileSystem](_fs_filesystem_.filesystem.md)

# Class: FileSystem

## Hierarchy

* **FileSystem**

## Implements

* UnixTree

## Index

### Constructors

* [constructor](_fs_filesystem_.filesystem.md#constructor)

### Properties

* [appPath](_fs_filesystem_.filesystem.md#apppath)
* [mmpt](_fs_filesystem_.filesystem.md#mmpt)
* [prettyTree](_fs_filesystem_.filesystem.md#prettytree)
* [privateTree](_fs_filesystem_.filesystem.md#privatetree)
* [proofs](_fs_filesystem_.filesystem.md#proofs)
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
* [publicise](_fs_filesystem_.filesystem.md#publicise)
* [publicize](_fs_filesystem_.filesystem.md#publicize)
* [read](_fs_filesystem_.filesystem.md#read)
* [rm](_fs_filesystem_.filesystem.md#rm)
* [write](_fs_filesystem_.filesystem.md#write)
* [empty](_fs_filesystem_.filesystem.md#static-empty)
* [fromCID](_fs_filesystem_.filesystem.md#static-fromcid)

## Constructors

###  constructor

\+ **new FileSystem**(`__namedParameters`: object): *[FileSystem](_fs_filesystem_.filesystem.md)*

*Defined in [src/fs/filesystem.ts:72](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L72)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`mmpt` | [MMPT](_fs_protocol_private_mmpt_.mmpt.md)‹› |
`prerequisites` | undefined &#124; object |
`prettyTree` | BareTree‹› |
`privateTree` | [PrivateTree](_fs_v1_privatetree_.privatetree.md)‹› |
`publicTree` | [PublicTree](_fs_v1_publictree_.publictree.md)‹› |
`root` | BareTree‹› |
`rootDid` | string |

**Returns:** *[FileSystem](_fs_filesystem_.filesystem.md)*

## Properties

###  appPath

• **appPath**: *AppPath | undefined*

*Defined in [src/fs/filesystem.ts:69](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L69)*

___

###  mmpt

• **mmpt**: *[MMPT](_fs_protocol_private_mmpt_.mmpt.md)*

*Defined in [src/fs/filesystem.ts:66](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L66)*

___

###  prettyTree

• **prettyTree**: *BareTree*

*Defined in [src/fs/filesystem.ts:64](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L64)*

___

###  privateTree

• **privateTree**: *[PrivateTree](_fs_v1_privatetree_.privatetree.md)*

*Defined in [src/fs/filesystem.ts:65](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L65)*

___

###  proofs

• **proofs**: *object*

*Defined in [src/fs/filesystem.ts:70](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L70)*

#### Type declaration:

* \[ **_**: *string*\]: [Ucan](../modules/_ucan_.md#ucan)

___

###  publicTree

• **publicTree**: *[PublicTree](_fs_v1_publictree_.publictree.md)*

*Defined in [src/fs/filesystem.ts:63](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L63)*

___

###  root

• **root**: *BareTree*

*Defined in [src/fs/filesystem.ts:62](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L62)*

___

###  rootDid

• **rootDid**: *string*

*Defined in [src/fs/filesystem.ts:67](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L67)*

___

###  syncHooks

• **syncHooks**: *Array‹SyncHook›*

*Defined in [src/fs/filesystem.ts:71](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L71)*

___

###  syncWhenOnline

• **syncWhenOnline**: *Array‹[CID, string]›*

*Defined in [src/fs/filesystem.ts:72](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L72)*

## Methods

###  add

▸ **add**(`path`: string, `content`: FileContent): *Promise‹this›*

*Defined in [src/fs/filesystem.ts:233](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L233)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`content` | FileContent |

**Returns:** *Promise‹this›*

___

###  cat

▸ **cat**(`path`: string): *Promise‹FileContent›*

*Defined in [src/fs/filesystem.ts:240](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L240)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹FileContent›*

___

###  deactivate

▸ **deactivate**(): *void*

*Defined in [src/fs/filesystem.ts:212](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L212)*

Deactivate a file system.

Use this when a user signs out.
The only function of this is to stop listing to online/offline events.

**Returns:** *void*

___

###  exists

▸ **exists**(`path`: string): *Promise‹boolean›*

*Defined in [src/fs/filesystem.ts:246](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L246)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹boolean›*

___

###  get

▸ **get**(`path`: string): *Promise‹Tree | File | null›*

*Defined in [src/fs/filesystem.ts:259](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L259)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹Tree | File | null›*

___

###  ls

▸ **ls**(`path`: string): *Promise‹BaseLinks›*

*Defined in [src/fs/filesystem.ts:227](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L227)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹BaseLinks›*

___

###  mkdir

▸ **mkdir**(`path`: string): *Promise‹this›*

*Defined in [src/fs/filesystem.ts:220](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L220)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹this›*

___

###  mv

▸ **mv**(`from`: string, `to`: string): *Promise‹this›*

*Defined in [src/fs/filesystem.ts:266](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L266)*

**Parameters:**

Name | Type |
------ | ------ |
`from` | string |
`to` | string |

**Returns:** *Promise‹this›*

___

###  publicise

▸ **publicise**(): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:294](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L294)*

Ensures the latest version of the file system is added to IPFS,
updates your data root, and returns the root CID.

**Returns:** *Promise‹CID›*

___

###  publicize

▸ **publicize**(): *Promise‹CID›*

*Defined in [src/fs/filesystem.ts:311](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L311)*

Alias for `publicise`.

**Returns:** *Promise‹CID›*

___

###  read

▸ **read**(`path`: string): *Promise‹FileContent | null›*

*Defined in [src/fs/filesystem.ts:278](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L278)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹FileContent | null›*

___

###  rm

▸ **rm**(`path`: string): *Promise‹this›*

*Defined in [src/fs/filesystem.ts:252](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L252)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹this›*

___

###  write

▸ **write**(`path`: string, `content`: FileContent): *Promise‹this›*

*Defined in [src/fs/filesystem.ts:282](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L282)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`content` | FileContent |

**Returns:** *Promise‹this›*

___

### `Static` empty

▸ **empty**(`opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*

*Defined in [src/fs/filesystem.ts:124](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L124)*

Creates a file system with an empty public tree & an empty private tree at the root.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md)›*

___

### `Static` fromCID

▸ **fromCID**(`cid`: CID, `opts`: FileSystemOptions): *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*

*Defined in [src/fs/filesystem.ts:160](https://github.com/fission-suite/webnative/blob/33d72ef/src/fs/filesystem.ts#L160)*

Loads an existing file system from a CID.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`cid` | CID | - |
`opts` | FileSystemOptions | {} |

**Returns:** *Promise‹[FileSystem](_fs_filesystem_.filesystem.md) | null›*
