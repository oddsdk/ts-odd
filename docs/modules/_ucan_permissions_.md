[Fission SDK](../README.md) › ["ucan/permissions"](_ucan_permissions_.md)

# Module: "ucan/permissions"

## Index

### Type aliases

* [AppInfo](_ucan_permissions_.md#appinfo)
* [FileSystemPermissions](_ucan_permissions_.md#filesystempermissions)
* [Permissions](_ucan_permissions_.md#permissions)

## Type aliases

###  AppInfo

Ƭ **AppInfo**: *object*

*Defined in [src/ucan/permissions.ts:6](https://github.com/fission-suite/webnative/blob/7fcf931/src/ucan/permissions.ts#L6)*

#### Type declaration:

* **creator**: *string*

* **name**: *string*

___

###  FileSystemPermissions

Ƭ **FileSystemPermissions**: *object*

*Defined in [src/ucan/permissions.ts:11](https://github.com/fission-suite/webnative/blob/7fcf931/src/ucan/permissions.ts#L11)*

#### Type declaration:

* **privatePaths**: *Array‹string›*

* **publicPaths**: *Array‹string›*

___

###  Permissions

Ƭ **Permissions**: *object*

*Defined in [src/ucan/permissions.ts:1](https://github.com/fission-suite/webnative/blob/7fcf931/src/ucan/permissions.ts#L1)*

#### Type declaration:

* **app**? : *[AppInfo](_ucan_permissions_.md#appinfo)*

* **fs**? : *[FileSystemPermissions](_ucan_permissions_.md#filesystempermissions)*
