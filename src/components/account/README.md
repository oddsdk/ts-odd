An account system is responsible for user accounts, represented through authorisation. An ODD SDK program has a UCAN store, this store contains the UCANs collected from various sources. The account system is one of those sources. These UCANs can then be provided to other devices/clients through the SDK's authority system.

The account system can access that UCAN store and use it to authorise various actions. Mainly this system exists to sync the state of the file system to another device, we take the file system's root pointer (aka. data root) and store it somewhere the other device can reach it.

There are a bunch of required methods that an account system needs to implement. The implementation specific methods live in the `annex`.
