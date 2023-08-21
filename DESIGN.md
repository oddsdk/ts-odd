# ODD

## Introduction

ODD stands for Open Distributed Data. We want our data accessible from anywhere and distributed, meaning that it can live partially or fully in multiple places. The ODD SDK does this through the [WNFS protocol](https://github.com/wnfs-wg).

Ideally as much as possible of this data lives on the devices of the owner of the data and communication of this data would be done in a decentralised peer-to-peer fashion. The ODD stack uses [UCAN](https://github.com/ucan-wg) to provide devices and users with the necessary authorisation. All of this should be usable offline.

Rather than putting everything in a closed system, ODD puts everything out in the open. That means encryption is used to keep data private. These encryption keys and authorisation "tickets" (UCANs) give us a chance to escape from passwords, so preferably passwords are avoided.

In summary, the ODD stack opts for a local-first approach. The user owns their data, is stored as closely to them as possible while still opting for convenience, applications cannot access data without permission and everything is usable without an internet connection.

## Implementation

ts-odd is written in Typescript, a Javascript dialect. The resulting code should be usable in any modern Javascript environment that supports the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) and [Web Assembly](https://webassembly.org/). It uses the Rust implementations of [WNFS](https://github.com/wnfs-wg/rs-wnfs) and [UCAN](https://github.com/ucan-wg/rs-ucan) which compile to Web Assembly.

Various other pieces are layered on top of these core protocols and assumptions, these are called "components" in ts-odd. They allow us to adapt to various technologies and environments. We'll start with the components that are closest to the data and go from there.

### Depot

The 'WNFS' file system that holds our user's data consists out of [IPLD](https://ipld.io/) blocks. These blocks make up the content-adressable web, another core idea to the ODD stack, making our data tamper-proof.

This component is reponsible for retrieving and storing these blocks. On the lowest level this means for any given bytes (data) give me back a CID (content address). And vice versa, when I present a CID, give me back the bytes for it.

Looking at this from a higher viewpoint, this unlocks the larger part of data syncing, we can transfer our blocks to a remote source.

### Account

Most of the time to push the data to a remote endpoint you will need some sort of account system, otherwise anyone could fill up the external storage space which costs money. The user accounts will be represented through authorisation, UCANs, our authorisation tickets.

In order to use ts-odd you'll be creating a `Program`, this is a specific setup of components, an artificial environment if you will. This program has a UCAN store, a repository of "authorisation tickets" collected from various sources. The account system is one of those sources. It can also access that UCAN store and then use it to authorise various actions.

This may also tie into the other part of data syncing, taking the file system's root CID (aka. data root) and storing it somewhere the other devices can reach it.

### Identifier & Agent

The account system also involves the identifier and agent components. The identifier signifies one of the user's identifiers and the agent delegates to external services. Both of these use decentralised identifiers ([DID](https://www.w3.org/TR/did-core/)s).

Typically the agent will use a temporary session key pair and the identifier is the more permanent identifier. Example flow: Identifier delegates to agent, agent contacts remote account service, account service issues UCANs addressed to identifier. Those UCANs are then used throughout the SDK to check for capabilities, etc.

The reason we have two components here is so that the identifier doesn't need to sign every time. This is useful for example with passkeys or blockchain wallets where you would get a popup each time you'd need to sign something.

### Authority

This component is reponsible for providing and requesting authority. Which technically means providing and requesting UCANs and file system secrets (access keys).

### Channel

The channel component is used to establish a channel. It serves as the public channel for the [AWAKE protocol](https://github.com/ucan-wg/awake). You can use whatever channel here as the AWAKE protocol used on top is responsible for establish a secure session. Typically this will be websockets or a P2P channel.

The channels are used for authority exchange and to communicate file system changes to a user's other devices.

### DNS

Determines how to do DNS queries.

### Storage

A key-value storage abstraction responsible for storing various pieces of session data, such as UCANs and crypto keys (depending on other components used).

### Manners

The manners component allows you to tweak various behaviours of an ODD program, such as logging and file system hooks (eg. what to do after a new file system is created).
