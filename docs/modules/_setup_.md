[Fission SDK](../README.md) › ["setup"](_setup_.md)

# Module: "setup"

## Index

### Functions

* [endpoints](_setup_.md#endpoints)
* [ipfs](_setup_.md#ipfs)

## Functions

###  endpoints

▸ **endpoints**(`e`: Partial‹[Endpoints](_setup_internal_.md#endpoints)›): *[Endpoints](_setup_internal_.md#endpoints)*

*Defined in [src/setup.ts:21](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/setup.ts#L21)*

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

*Defined in [src/setup.ts:41](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/setup.ts#L41)*

Override the IPFS config.

The given object will be merged together with the default configuration,
and then passed to `Ipfs.create()`

If you wish to override the `config.Bootstrap` list,
you can get the default value as follows:
```js
import { PEER_WSS, defaultOptions } from 'fission-sdk/ipfs'
// `PEER_WSS` is the default `Bootstrap` node
defaultOptions.config.Bootstrap
```

**Parameters:**

Name | Type |
------ | ------ |
`s` | UnknownObject |

**Returns:** *UnknownObject*
