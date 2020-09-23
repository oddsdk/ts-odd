[Fission SDK](../README.md) › ["data-root"](_data_root_.md)

# Module: "data-root"

## Index

### Functions

* [lookup](_data_root_.md#lookup)
* [lookupOnFisson](_data_root_.md#lookuponfisson)
* [update](_data_root_.md#update)

## Functions

###  lookup

▸ **lookup**(`username`: string): *Promise‹CID | null›*

*Defined in [src/data-root.ts:27](https://github.com/fission-suite/webnative/blob/693f51f/src/data-root.ts#L27)*

Get the CID of a user's data root.
First check Fission server, then check DNS

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`username` | string | The username of the user that we want to get the data root of.  |

**Returns:** *Promise‹CID | null›*

___

###  lookupOnFisson

▸ **lookupOnFisson**(`username`: string): *Promise‹CID | null›*

*Defined in [src/data-root.ts:48](https://github.com/fission-suite/webnative/blob/693f51f/src/data-root.ts#L48)*

Get the CID of a user's data root from the Fission server.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`username` | string | The username of the user that we want to get the data root of.  |

**Returns:** *Promise‹CID | null›*

___

###  update

▸ **update**(`cid`: CID | string, `proof`: string): *Promise‹void›*

*Defined in [src/data-root.ts:70](https://github.com/fission-suite/webnative/blob/693f51f/src/data-root.ts#L70)*

Update a user's data root.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cid` | CID &#124; string | The CID of the data root. |
`proof` | string | The proof to use in the UCAN sent to the API.  |

**Returns:** *Promise‹void›*
