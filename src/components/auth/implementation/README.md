# Implementations

`base`: Basic functionality for account delegation and device linking, all implementations inherit from this. A UCAN is issued to the other device, giving it full rights.
`wnfs`: Extends `base` so that it also provides the linked device with the root read key of a user's filesystem. Self-authorises an additional UCAN so that it can write to the filesystem. Linking only occurs between devices that have access to the root read key of a filesystem.

These implementations don't have a default user registration system, that's where Fission comes in.