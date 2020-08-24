# FileSystem

Below is a brief overview of the different types used for the Fission FileSystem

## Interfaces

### Tree / File vs HeaderTree / HeaderFile
`Tree` / `File` describe the main interfaces for trees and files. `HeaderTree` / `HeaderFile` inherit from `Tree` / `File` but include extra methods for dealing with header options (metadata, pins, caching, etc).

## Classes

### BaseTree / BaseFile
These are abstract classes that implement methods that are common to all trees and files: `ls`, `mkdir`, `cat`, `add`, `rm`, `get`. These classes implement the `Tree` & `File` interfaces respectively.

### BareTree / BareFile
These are isomorphic to IPFS DAG objects, but contain a wrapper so that they share a common interface with our custom Tree nodes. These are all public, and implement the `Tree` interface.

### PublicTree / PublicFile
This is v1.0.0 of the Fission FileSystem. It uses a 2-layer approach where each directory actually points to a "header" directory which incldues all of the metadata and FFS features for folders & files as well as an `userland` link that points to the actual tree or file. Each directory contains a `skeleton` of the directory structure beneath it. This allows you to make one trip to the network and derive the entire skeleton of a file system

### PrivateTree / PrivateFile
These inherit from `PublicTree` / `PublicFile`, but each node has a `parentKey` and an `ownKey`. where the folder itself is encrypted with the `parentKey` and `userland` & it's decendents are encrypted with `ownKey`

### Inheritance structure
As additional versions of the FS are added, the inheritance structure will look like:
```
publicV1.0.0 -> privateV1.0.0
       |                 
       v
publicV1.0.1 -> privateV1.0.1
       |                 
       v
publicV1.1.0 -> privateV1.1.0
```

### Header
Most Fission FileSystem information is stored in the Header file. So most upgrades to the version of a FileSystem will include upgrades to the Header. This means we'll likely have a different `Header` type for each version of the FileSystem, and we can expect a simple lineage of inheritance (`HeaderV1.0.0 -> HeaderV1.0.1 -> HeaderV1.1.0`). Each version of the FileSystem will include an implementation of `PublicTree`, `PublicFile`, `PrivateTree`, `PrivateFile`, and a `Header` parser
