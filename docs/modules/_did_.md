[Fission SDK](../README.md) › ["did"](_did_.md)

# Module: "did"

## Index

### References

* [ucan](_did_.md#ucan)

### Functions

* [didToPublicKey](_did_.md#didtopublickey)
* [exchange](_did_.md#exchange)
* [publicKeyToDid](_did_.md#publickeytodid)
* [root](_did_.md#root)
* [verifySignedData](_did_.md#verifysigneddata)
* [write](_did_.md#write)

## References

###  ucan

• **ucan**:

## Functions

###  didToPublicKey

▸ **didToPublicKey**(`did`: string): *object*

*Defined in [src/did.ts:90](https://github.com/fission-suite/webnative/blob/d222548/src/did.ts#L90)*

Convert a DID (did:key) to a base64 public key.

**Parameters:**

Name | Type |
------ | ------ |
`did` | string |

**Returns:** *object*

* **publicKey**: *string*

* **type**: *CryptoSystem*

___

###  exchange

▸ **exchange**(): *Promise‹string›*

*Defined in [src/did.ts:26](https://github.com/fission-suite/webnative/blob/d222548/src/did.ts#L26)*

Create a DID based on the exchange key-pair.

**Returns:** *Promise‹string›*

___

###  publicKeyToDid

▸ **publicKeyToDid**(`publicKey`: string, `type`: CryptoSystem): *string*

*Defined in [src/did.ts:73](https://github.com/fission-suite/webnative/blob/d222548/src/did.ts#L73)*

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

*Defined in [src/did.ts:37](https://github.com/fission-suite/webnative/blob/d222548/src/did.ts#L37)*

Get the root write-key DID for a user.
Stored at `_did.${username}.${endpoints.user}`

**Parameters:**

Name | Type |
------ | ------ |
`username` | string |

**Returns:** *Promise‹string›*

___

###  verifySignedData

▸ **verifySignedData**(`__namedParameters`: object): *Promise‹boolean›*

*Defined in [src/did.ts:116](https://github.com/fission-suite/webnative/blob/d222548/src/did.ts#L116)*

Verify the signature of some data (string, ArrayBuffer or Uint8Array), given a DID.

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`data` | string &#124; ArrayBuffer &#124; Uint8Array‹› |
`did` | string |
`signature` | string |

**Returns:** *Promise‹boolean›*

___

###  write

▸ **write**(): *Promise‹string›*

*Defined in [src/did.ts:58](https://github.com/fission-suite/webnative/blob/d222548/src/did.ts#L58)*

Create a DID based on the write key-pair.

**Returns:** *Promise‹string›*
