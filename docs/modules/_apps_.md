[Fission SDK](../README.md) › ["apps"](_apps_.md)

# Module: "apps"

## Index

### Type aliases

* [App](_apps_.md#app)

### Functions

* [create](_apps_.md#create)
* [deleteByURL](_apps_.md#deletebyurl)
* [index](_apps_.md#index)

## Type aliases

###  App

Ƭ **App**: *object*

*Defined in [src/apps.ts:10](https://github.com/fission-suite/webnative/blob/3b06253/src/apps.ts#L10)*

#### Type declaration:

* **domain**: *string*

## Functions

###  create

▸ **create**(`subdomain`: Maybe‹string›): *Promise‹[App](_apps_.md#app)›*

*Defined in [src/apps.ts:50](https://github.com/fission-suite/webnative/blob/3b06253/src/apps.ts#L50)*

Creates a new app, assigns an initial subdomain, and sets an asset placeholder

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`subdomain` | Maybe‹string› | Subdomain to create the fission app with  |

**Returns:** *Promise‹[App](_apps_.md#app)›*

___

###  deleteByURL

▸ **deleteByURL**(`url`: string): *Promise‹void›*

*Defined in [src/apps.ts:84](https://github.com/fission-suite/webnative/blob/3b06253/src/apps.ts#L84)*

Destroy app by any associated URL

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`url` | string | The url we want to delete  |

**Returns:** *Promise‹void›*

___

###  index

▸ **index**(): *Promise‹Array‹[App](_apps_.md#app)››*

*Defined in [src/apps.ts:19](https://github.com/fission-suite/webnative/blob/3b06253/src/apps.ts#L19)*

Get A list of all of your apps and their associated domain names

**Returns:** *Promise‹Array‹[App](_apps_.md#app)››*
