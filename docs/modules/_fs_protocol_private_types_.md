[Fission SDK](../README.md) › ["fs/protocol/private/types"](_fs_protocol_private_types_.md)

# Module: "fs/protocol/private/types"

## Index

### Type aliases

* [DecryptedNode](_fs_protocol_private_types_.md#decryptednode)
* [PrivateAddResult](_fs_protocol_private_types_.md#privateaddresult)
* [PrivateFileInfo](_fs_protocol_private_types_.md#privatefileinfo)
* [PrivateLink](_fs_protocol_private_types_.md#privatelink)
* [PrivateLinks](_fs_protocol_private_types_.md#privatelinks)
* [PrivateSkeleton](_fs_protocol_private_types_.md#privateskeleton)
* [PrivateSkeletonInfo](_fs_protocol_private_types_.md#privateskeletoninfo)
* [PrivateTreeInfo](_fs_protocol_private_types_.md#privatetreeinfo)

## Type aliases

###  DecryptedNode

Ƭ **DecryptedNode**: *[PrivateFileInfo](_fs_protocol_private_types_.md#privatefileinfo) | [PrivateTreeInfo](_fs_protocol_private_types_.md#privatetreeinfo)*

*Defined in [src/fs/protocol/private/types.ts:6](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L6)*

___

###  PrivateAddResult

Ƭ **PrivateAddResult**: *AddResult & object*

*Defined in [src/fs/protocol/private/types.ts:39](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L39)*

___

###  PrivateFileInfo

Ƭ **PrivateFileInfo**: *object*

*Defined in [src/fs/protocol/private/types.ts:8](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L8)*

#### Type declaration:

* **bareNameFilter**: *[BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter)*

* **content**: *CID*

* **key**: *string*

* **metadata**: *Metadata*

* **revision**: *number*

___

###  PrivateLink

Ƭ **PrivateLink**: *BaseLink & object*

*Defined in [src/fs/protocol/private/types.ts:16](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L16)*

___

###  PrivateLinks

Ƭ **PrivateLinks**: *object*

*Defined in [src/fs/protocol/private/types.ts:21](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L21)*

#### Type declaration:

* \[ **name**: *string*\]: [PrivateLink](_fs_protocol_private_types_.md#privatelink)

___

###  PrivateSkeleton

Ƭ **PrivateSkeleton**: *object*

*Defined in [src/fs/protocol/private/types.ts:31](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L31)*

#### Type declaration:

* \[ **name**: *string*\]: [PrivateSkeletonInfo](_fs_protocol_private_types_.md#privateskeletoninfo)

___

###  PrivateSkeletonInfo

Ƭ **PrivateSkeletonInfo**: *object*

*Defined in [src/fs/protocol/private/types.ts:33](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L33)*

#### Type declaration:

* **cid**: *CID*

* **key**: *string*

* **subSkeleton**: *[PrivateSkeleton](_fs_protocol_private_types_.md#privateskeleton)*

___

###  PrivateTreeInfo

Ƭ **PrivateTreeInfo**: *object*

*Defined in [src/fs/protocol/private/types.ts:23](https://github.com/fission-suite/webnative/blob/935d7b8/src/fs/protocol/private/types.ts#L23)*

#### Type declaration:

* **bareNameFilter**: *[BareNameFilter](_fs_protocol_private_namefilter_.md#barenamefilter)*

* **links**: *[PrivateLinks](_fs_protocol_private_types_.md#privatelinks)*

* **metadata**: *Metadata*

* **revision**: *number*

* **skeleton**: *[PrivateSkeleton](_fs_protocol_private_types_.md#privateskeleton)*
