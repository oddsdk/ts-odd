[Fission SDK](../README.md) › ["ipfs/config"](_ipfs_config_.md)

# Module: "ipfs/config"

## Index

### Variables

* [JS_IPFS](_ipfs_config_.md#const-js_ipfs)
* [PEER_WSS](_ipfs_config_.md#const-peer_wss)

### Functions

* [get](_ipfs_config_.md#const-get)
* [set](_ipfs_config_.md#const-set)

### Object literals

* [defaultOptions](_ipfs_config_.md#const-defaultoptions)

## Variables

### `Const` JS_IPFS

• **JS_IPFS**: *"https://cdnjs.cloudflare.com/ajax/libs/ipfs/0.48.0/index.min.js"* = "https://cdnjs.cloudflare.com/ajax/libs/ipfs/0.48.0/index.min.js"

*Defined in [src/ipfs/config.ts:12](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/ipfs/config.ts#L12)*

___

### `Const` PEER_WSS

• **PEER_WSS**: *"/dns4/node.fission.systems/tcp/4003/wss/ipfs/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw"* = "/dns4/node.fission.systems/tcp/4003/wss/ipfs/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw"

*Defined in [src/ipfs/config.ts:13](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/ipfs/config.ts#L13)*

## Functions

### `Const` get

▸ **get**(): *Promise‹IPFS›*

*Defined in [src/ipfs/config.ts:29](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/ipfs/config.ts#L29)*

**Returns:** *Promise‹IPFS›*

___

### `Const` set

▸ **set**(`userIpfs`: unknown): *void*

*Defined in [src/ipfs/config.ts:25](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/ipfs/config.ts#L25)*

**Parameters:**

Name | Type |
------ | ------ |
`userIpfs` | unknown |

**Returns:** *void*

## Object literals

### `Const` defaultOptions

### ▪ **defaultOptions**: *object*

*Defined in [src/ipfs/config.ts:19](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/ipfs/config.ts#L19)*

▪ **config**: *object*

*Defined in [src/ipfs/config.ts:20](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/ipfs/config.ts#L20)*

* **Bootstrap**: *string[]* = [ PEER_WSS ]
