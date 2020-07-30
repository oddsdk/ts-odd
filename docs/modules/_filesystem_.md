[Fission SDK](../README.md) › ["filesystem"](_filesystem_.md)

# Module: "filesystem"

## Index

### Functions

* [loadFileSystem](_filesystem_.md#loadfilesystem)

## Functions

###  loadFileSystem

▸ **loadFileSystem**(`username?`: undefined | string): *Promise‹[FileSystem](../classes/_fs_filesystem_.filesystem.md)›*

*Defined in [src/filesystem.ts:16](https://github.com/fission-suite/ts-sdk/blob/ef36578/src/filesystem.ts#L16)*

Load a user's file system.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`username?` | undefined &#124; string | Optional, username of the user to load the file system from.                 Will try to load the file system of the authenticated user                 by default. Throws an error if there's no authenticated user.  |

**Returns:** *Promise‹[FileSystem](../classes/_fs_filesystem_.filesystem.md)›*
