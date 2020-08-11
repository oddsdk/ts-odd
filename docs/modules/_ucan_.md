[Fission SDK](../README.md) › ["ucan"](_ucan_.md)

# Module: "ucan"

## Index

### Type aliases

* [Resource](_ucan_.md#resource)
* [Ucan](_ucan_.md#ucan)

### Variables

* [WNFS_PREFIX](_ucan_.md#const-wnfs_prefix)

### Functions

* [build](_ucan_.md#build)
* [compileDictionary](_ucan_.md#compiledictionary)
* [decode](_ucan_.md#decode)
* [encode](_ucan_.md#encode)
* [isExpired](_ucan_.md#isexpired)
* [rootIssuer](_ucan_.md#rootissuer)

## Type aliases

###  Resource

Ƭ **Resource**: *"*" | Record‹string, string›*

*Defined in [src/ucan.ts:10](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L10)*

___

###  Ucan

Ƭ **Ucan**: *object*

*Defined in [src/ucan.ts:13](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L13)*

#### Type declaration:

* **header**(): *object*

  * **alg**: *string*

  * **typ**: *string*

  * **uav**: *string*

* **payload**(): *object*

  * **aud**: *string*

  * **exp**: *number*

  * **iss**: *string*

  * **nbf**: *string*

  * **prf**: *string | undefined*

  * **ptc**: *string | undefined | null*

  * **rsc**: *[Resource](_ucan_.md#resource)*

* **signature**: *string*

## Variables

### `Const` WNFS_PREFIX

• **WNFS_PREFIX**: *"floofs"* = "floofs"

*Defined in [src/ucan.ts:38](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L38)*

## Functions

###  build

▸ **build**(`__namedParameters`: object): *Promise‹string›*

*Defined in [src/ucan.ts:66](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L66)*

Create a UCAN, User Controlled Authorization Networks, JWT.
This JWT can be used for authorization.

### Header

`alg`, Algorithm, the type of signature.
`typ`, Type, the type of this data structure, JWT.
`uav`, UCAN version.

### Payload

`aud`, Audience, the ID of who it's intended for.
`exp`, Expiry, unix timestamp of when the jwt is no longer valid.
`iss`, Issuer, the ID of who sent this.
`nbf`, Not Before, unix timestamp of when the jwt becomes valid.
`prf`, Proof, an optional nested token with equal or greater privileges.
`ptc`, Potency, which rights come with the token.
`rsc`, Resource, the involved resource.

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type | Default |
------ | ------ | ------ |
`audience` | string | - |
`issuer` | string | - |
`lifetimeInSeconds` | number | 30 |
`potency` | null &#124; string | "APPEND" |
`proof` | undefined &#124; string | - |
`resource` | "*" &#124; object | "*" |

**Returns:** *Promise‹string›*

___

###  compileDictionary

▸ **compileDictionary**(`ucans`: Array‹string›): *Record‹string, [Ucan](_ucan_.md#ucan)›*

*Defined in [src/ucan.ts:119](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L119)*

Given a list of UCANs, generate a dictionary.
The key will be in the form of `${resourceKey}:${resourceValue}`

**Parameters:**

Name | Type |
------ | ------ |
`ucans` | Array‹string› |

**Returns:** *Record‹string, [Ucan](_ucan_.md#ucan)›*

___

###  decode

▸ **decode**(`ucan`: string): *[Ucan](_ucan_.md#ucan)*

*Defined in [src/ucan.ts:145](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L145)*

Try to decode a UCAN.
Will throw if it fails.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`ucan` | string | The encoded UCAN to decode  |

**Returns:** *[Ucan](_ucan_.md#ucan)*

___

###  encode

▸ **encode**(`ucan`: [Ucan](_ucan_.md#ucan)): *string*

*Defined in [src/ucan.ts:162](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L162)*

Encode a UCAN.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`ucan` | [Ucan](_ucan_.md#ucan) | The UCAN to encode  |

**Returns:** *string*

___

###  isExpired

▸ **isExpired**(`ucan`: [Ucan](_ucan_.md#ucan)): *boolean*

*Defined in [src/ucan.ts:176](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L176)*

Check if a UCAN is expired.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`ucan` | [Ucan](_ucan_.md#ucan) | The UCAN to validate  |

**Returns:** *boolean*

___

###  rootIssuer

▸ **rootIssuer**(`ucan`: string, `level`: number): *string*

*Defined in [src/ucan.ts:189](https://github.com/fission-suite/webnative/blob/33d72ef/src/ucan.ts#L189)*

Given a UCAN, lookup the root issuer.

Throws when given an improperly formatted UCAN.
This could be a nested UCAN (ie. proof).

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`ucan` | string | - | A UCAN. |
`level` | number | 0 | - |

**Returns:** *string*

The root issuer.
