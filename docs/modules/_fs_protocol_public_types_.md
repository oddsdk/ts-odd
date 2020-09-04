[Fission SDK](../README.md) › ["fs/protocol/public/types"](_fs_protocol_public_types_.md)

# Module: "fs/protocol/public/types"

## Index

### Type aliases

* [FileHeader](_fs_protocol_public_types_.md#fileheader)
* [FileInfo](_fs_protocol_public_types_.md#fileinfo)
* [Skeleton](_fs_protocol_public_types_.md#skeleton)
* [SkeletonInfo](_fs_protocol_public_types_.md#skeletoninfo)
* [TreeHeader](_fs_protocol_public_types_.md#treeheader)
* [TreeInfo](_fs_protocol_public_types_.md#treeinfo)

## Type aliases

###  FileHeader

Ƭ **FileHeader**: *object*

*Defined in [src/fs/protocol/public/types.ts:23](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/public/types.ts#L23)*

#### Type declaration:

* **metadata**: *Metadata*

___

###  FileInfo

Ƭ **FileInfo**: *[FileHeader](_fs_protocol_public_types_.md#fileheader) & object*

*Defined in [src/fs/protocol/public/types.ts:27](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/public/types.ts#L27)*

___

###  Skeleton

Ƭ **Skeleton**: *object*

*Defined in [src/fs/protocol/public/types.ts:12](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/public/types.ts#L12)*

#### Type declaration:

* \[ **name**: *string*\]: [SkeletonInfo](_fs_protocol_public_types_.md#skeletoninfo)

___

###  SkeletonInfo

Ƭ **SkeletonInfo**: *object*

*Defined in [src/fs/protocol/public/types.ts:4](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/public/types.ts#L4)*

#### Type declaration:

* **cid**: *CID*

* **isFile**: *boolean*

* **metadata**: *CID*

* **subSkeleton**: *[Skeleton](_fs_protocol_public_types_.md#skeleton)*

* **userland**: *CID*

___

###  TreeHeader

Ƭ **TreeHeader**: *object*

*Defined in [src/fs/protocol/public/types.ts:14](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/public/types.ts#L14)*

#### Type declaration:

* **metadata**: *Metadata*

* **skeleton**: *[Skeleton](_fs_protocol_public_types_.md#skeleton)*

___

###  TreeInfo

Ƭ **TreeInfo**: *[TreeHeader](_fs_protocol_public_types_.md#treeheader) & object*

*Defined in [src/fs/protocol/public/types.ts:19](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/public/types.ts#L19)*
