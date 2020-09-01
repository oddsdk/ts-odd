[Fission SDK](../README.md) › ["ipfs/config"](_ipfs_config_.md)

# Module: "ipfs/config"

## Index

### Variables

* [DELEGATE_ADDR](_ipfs_config_.md#const-delegate_addr)
* [JS_IPFS](_ipfs_config_.md#const-js_ipfs)
* [PEER_WSS](_ipfs_config_.md#const-peer_wss)

### Functions

* [get](_ipfs_config_.md#const-get)
* [set](_ipfs_config_.md#const-set)

### Object literals

* [defaultOptions](_ipfs_config_.md#const-defaultoptions)

## Variables

### `Const` DELEGATE_ADDR

• **DELEGATE_ADDR**: *"/dns4/ipfs.runfission.com/tcp/443/https"* = "/dns4/ipfs.runfission.com/tcp/443/https"

*Defined in [src/ipfs/config.ts:14](https://github.com/fission-suite/webnative/blob/33d72ef/src/ipfs/config.ts#L14)*

___

### `Const` JS_IPFS

• **JS_IPFS**: *"https://cdnjs.cloudflare.com/ajax/libs/ipfs/0.49.1/index.min.js"* = "https://cdnjs.cloudflare.com/ajax/libs/ipfs/0.49.1/index.min.js"

*Defined in [src/ipfs/config.ts:12](https://github.com/fission-suite/webnative/blob/33d72ef/src/ipfs/config.ts#L12)*

___

### `Const` PEER_WSS

• **PEER_WSS**: *"/dns4/node.fission.systems/tcp/4003/wss/ipfs/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw"* = "/dns4/node.fission.systems/tcp/4003/wss/ipfs/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw"

*Defined in [src/ipfs/config.ts:13](https://github.com/fission-suite/webnative/blob/33d72ef/src/ipfs/config.ts#L13)*

## Functions

### `Const` get

▸ **get**(): *Promise‹IPFS›*

*Defined in [src/ipfs/config.ts:33](https://github.com/fission-suite/webnative/blob/33d72ef/src/ipfs/config.ts#L33)*

**Returns:** *Promise‹IPFS›*

___

### `Const` set

▸ **set**(`userIpfs`: unknown): *void*

*Defined in [src/ipfs/config.ts:29](https://github.com/fission-suite/webnative/blob/33d72ef/src/ipfs/config.ts#L29)*

**Parameters:**

Name | Type |
------ | ------ |
`userIpfs` | unknown |

**Returns:** *void*

## Object literals

### `Const` defaultOptions

### ▪ **defaultOptions**: *object*

*Defined in [src/ipfs/config.ts:20](https://github.com/fission-suite/webnative/blob/33d72ef/src/ipfs/config.ts#L20)*

▪ **config**: *object*

*Defined in [src/ipfs/config.ts:21](https://github.com/fission-suite/webnative/blob/33d72ef/src/ipfs/config.ts#L21)*

* **Bootstrap**: *string[]* = [ PEER_WSS ]

* **Addresses**: *object*

  * **Delegates**: *string[]* = [ DELEGATE_ADDR ]
