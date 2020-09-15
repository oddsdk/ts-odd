[Fission SDK](../README.md) › ["ucan/internal"](_ucan_internal_.md)

# Module: "ucan/internal"

## Index

### Functions

* [clearStorage](_ucan_internal_.md#clearstorage)
* [dictionaryFilesystemPrefix](_ucan_internal_.md#dictionaryfilesystemprefix)
* [lookupFilesystemUcan](_ucan_internal_.md#lookupfilesystemucan)
* [store](_ucan_internal_.md#store)
* [validatePermissions](_ucan_internal_.md#validatepermissions)

## Functions

###  clearStorage

▸ **clearStorage**(): *Promise‹void›*

*Defined in [src/ucan/internal.ts:21](https://github.com/fission-suite/webnative/blob/d222548/src/ucan/internal.ts#L21)*

You didn't see anything 👀

**Returns:** *Promise‹void›*

___

###  dictionaryFilesystemPrefix

▸ **dictionaryFilesystemPrefix**(`username`: string): *string*

*Defined in [src/ucan/internal.ts:29](https://github.com/fission-suite/webnative/blob/d222548/src/ucan/internal.ts#L29)*

Lookup the prefix for a filesystem key in the dictionary.

**Parameters:**

Name | Type |
------ | ------ |
`username` | string |

**Returns:** *string*

___

###  lookupFilesystemUcan

▸ **lookupFilesystemUcan**(`path`: string): *Promise‹[Ucan](_ucan_.md#ucan) | null›*

*Defined in [src/ucan/internal.ts:39](https://github.com/fission-suite/webnative/blob/d222548/src/ucan/internal.ts#L39)*

Look up a UCAN with a file system path.

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |

**Returns:** *Promise‹[Ucan](_ucan_.md#ucan) | null›*

___

###  store

▸ **store**(`ucans`: Array‹string›): *Promise‹void›*

*Defined in [src/ucan/internal.ts:61](https://github.com/fission-suite/webnative/blob/d222548/src/ucan/internal.ts#L61)*

Store UCANs and update the in-memory dictionary.

**Parameters:**

Name | Type |
------ | ------ |
`ucans` | Array‹string› |

**Returns:** *Promise‹void›*

___

###  validatePermissions

▸ **validatePermissions**(`__namedParameters`: object, `username`: string): *boolean*

*Defined in [src/ucan/internal.ts:77](https://github.com/fission-suite/webnative/blob/d222548/src/ucan/internal.ts#L77)*

See if the stored UCANs in the in-memory dictionary
conform to the given `Permissions`.

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`app` | undefined &#124; object |
`fs` | undefined &#124; object |

▪ **username**: *string*

**Returns:** *boolean*
