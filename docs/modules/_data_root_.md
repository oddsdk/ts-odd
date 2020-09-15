[Fission SDK](../README.md) › ["data-root"](_data_root_.md)

# Module: "data-root"

## Index

### Functions

* [lookup](_data_root_.md#lookup)
* [update](_data_root_.md#update)

## Functions

###  lookup

▸ **lookup**(`username`: string): *Promise‹CID | null›*

*Defined in [src/data-root.ts:17](https://github.com/fission-suite/webnative/blob/d222548/src/data-root.ts#L17)*

Get the CID of a user's data root.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`username` | string | The username of the user that we want to get the data root of.  |

**Returns:** *Promise‹CID | null›*

___

###  update

▸ **update**(`cid`: CID | string, `proof`: string): *Promise‹void›*

*Defined in [src/data-root.ts:34](https://github.com/fission-suite/webnative/blob/d222548/src/data-root.ts#L34)*

Update a user's data root.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cid` | CID &#124; string | The CID of the data root. |
`proof` | string | The proof to use in the UCAN sent to the API.  |

**Returns:** *Promise‹void›*
