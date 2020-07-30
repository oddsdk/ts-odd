[Fission SDK](../README.md) › ["data-root"](_data_root_.md)

# Module: "data-root"

## Index

### Functions

* [lookup](_data_root_.md#lookup)
* [update](_data_root_.md#update)

## Functions

###  lookup

▸ **lookup**(`username`: string): *Promise‹CID | null›*

*Defined in [src/data-root.ts:16](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/data-root.ts#L16)*

Get the CID of a user's data root.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`username` | string | The username of the user that we want to get the data root of.  |

**Returns:** *Promise‹CID | null›*

___

###  update

▸ **update**(`cid`: CID | string): *Promise‹void›*

*Defined in [src/data-root.ts:31](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/data-root.ts#L31)*

Update a user's data root.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cid` | CID &#124; string | The CID of the data root.  |

**Returns:** *Promise‹void›*
