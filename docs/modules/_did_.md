[Fission SDK](../README.md) › ["did"](_did_.md)

# Module: "did"

## Index

### Functions

* [didToPublicKey](_did_.md#didtopublickey)
* [local](_did_.md#local)
* [publicKeyToDid](_did_.md#publickeytodid)
* [root](_did_.md#root)
* [verifySignedData](_did_.md#verifysigneddata)

## Functions

###  didToPublicKey

▸ **didToPublicKey**(`did`: string): *object*

*Defined in [src/did.ts:75](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/did.ts#L75)*

Convert a DID (did:key) to a base64 public key.

**Parameters:**

Name | Type |
------ | ------ |
`did` | string |

**Returns:** *object*

* **publicKey**: *string*

* **type**: *CryptoSystem*

___

###  local

▸ **local**(): *Promise‹string›*

*Defined in [src/did.ts:26](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/did.ts#L26)*

Create a DID to authenticate with.

**Returns:** *Promise‹string›*

___

###  publicKeyToDid

▸ **publicKeyToDid**(`publicKey`: string, `type`: CryptoSystem): *string*

*Defined in [src/did.ts:58](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/did.ts#L58)*

Convert a base64 public key to a DID (did:key).

**Parameters:**

Name | Type |
------ | ------ |
`publicKey` | string |
`type` | CryptoSystem |

**Returns:** *string*

___

###  root

▸ **root**(`username`: string): *Promise‹string›*

*Defined in [src/did.ts:37](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/did.ts#L37)*

Gets the root DID for a user.
Stored at `_did.${username}.${endpoints.user}`

**Parameters:**

Name | Type |
------ | ------ |
`username` | string |

**Returns:** *Promise‹string›*

___

###  verifySignedData

▸ **verifySignedData**(`__namedParameters`: object): *Promise‹boolean›*

*Defined in [src/did.ts:101](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/did.ts#L101)*

Verify the signature of some data (string, ArrayBuffer or Uint8Array), given a DID.

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`data` | string &#124; ArrayBuffer &#124; Uint8Array‹› |
`did` | string |
`signature` | string |

**Returns:** *Promise‹boolean›*
