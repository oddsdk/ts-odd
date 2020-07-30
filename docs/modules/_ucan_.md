[Fission SDK](../README.md) › ["ucan"](_ucan_.md)

# Module: "ucan"

## Index

### Functions

* [build](_ucan_.md#build)
* [rootIssuer](_ucan_.md#rootissuer)

## Functions

###  build

▸ **build**(`__namedParameters`: object): *Promise‹string›*

*Defined in [src/ucan.ts:28](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/ucan.ts#L28)*

Create a UCAN, User Controlled Authorization Networks, JWT.
This JWT can be used for authorization.

### Header

`alg`, Algorithm, the type of signature.
`typ`, Type, the type of this data structure, JWT.
`uav`, UCAN version.

### Body

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
`proof` | undefined &#124; string | - |
`resource` | "*" &#124; object | "*" |

**Returns:** *Promise‹string›*

___

###  rootIssuer

▸ **rootIssuer**(`ucan`: string, `level`: number): *string*

*Defined in [src/ucan.ts:84](https://github.com/fission-suite/ts-sdk/blob/f59fd0a/src/ucan.ts#L84)*

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
