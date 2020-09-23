[Fission SDK](../README.md) › ["setup"](_setup_.md)

# Module: "setup"

## Index

### Functions

* [debug](_setup_.md#debug)
* [endpoints](_setup_.md#endpoints)
* [ipfs](_setup_.md#ipfs)

## Functions

###  debug

▸ **debug**(`__namedParameters`: object): *boolean*

*Defined in [src/setup.ts:13](https://github.com/fission-suite/webnative/blob/3b06253/src/setup.ts#L13)*

Toggle debug mode.

Only adds a few `console.log`s at this moment.

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`enabled` | boolean |

**Returns:** *boolean*

___

###  endpoints

▸ **endpoints**(`e`: Partial‹[Endpoints](_setup_internal_.md#endpoints)›): *[Endpoints](_setup_internal_.md#endpoints)*

*Defined in [src/setup.ts:32](https://github.com/fission-suite/webnative/blob/3b06253/src/setup.ts#L32)*

Override endpoints.

You can override each of these,
no need to provide them all here.

`api` Location of the Fission API
      (default `https://runfission.com`)
`lobby` Location of the authentication lobby.
        (default `https://auth.fission.codes`)
`user`  User's domain to use, will be prefixed by username.
        (default `fission.name`)

**Parameters:**

Name | Type |
------ | ------ |
`e` | Partial‹[Endpoints](_setup_internal_.md#endpoints)› |

**Returns:** *[Endpoints](_setup_internal_.md#endpoints)*

___

###  ipfs

▸ **ipfs**(`s`: UnknownObject): *UnknownObject*

*Defined in [src/setup.ts:52](https://github.com/fission-suite/webnative/blob/3b06253/src/setup.ts#L52)*

Override the IPFS config.

The given object will be merged together with the default configuration,
and then passed to `Ipfs.create()`

If you wish to override the `config.Bootstrap` list,
you can get the default value as follows:
```js
import { PEER_WSS, defaultOptions } from 'webnative/ipfs'
// `PEER_WSS` is the default `Bootstrap` node
defaultOptions.config.Bootstrap
```

**Parameters:**

Name | Type |
------ | ------ |
`s` | UnknownObject |

**Returns:** *UnknownObject*
