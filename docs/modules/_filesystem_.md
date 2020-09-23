[Fission SDK](../README.md) › ["filesystem"](_filesystem_.md)

# Module: "filesystem"

## Index

### Functions

* [loadFileSystem](_filesystem_.md#loadfilesystem)

## Functions

###  loadFileSystem

▸ **loadFileSystem**(`permissions`: Maybe‹[Permissions](_ucan_permissions_.md#permissions)›, `username?`: undefined | string): *Promise‹[FileSystem](../classes/_fs_filesystem_.filesystem.md)›*

*Defined in [src/filesystem.ts:21](https://github.com/fission-suite/webnative/blob/693f51f/src/filesystem.ts#L21)*

Load a user's file system.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`permissions` | Maybe‹[Permissions](_ucan_permissions_.md#permissions)› | The permissions from initialise.                    Pass `null` if working without permissions |
`username?` | undefined &#124; string | Optional, username of the user to load the file system from.                 Will try to load the file system of the authenticated user                 by default. Throws an error if there's no authenticated user.  |

**Returns:** *Promise‹[FileSystem](../classes/_fs_filesystem_.filesystem.md)›*
