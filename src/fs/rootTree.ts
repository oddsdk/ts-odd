import * as Raw from "multiformats/codecs/raw"
import * as Uint8Arrays from "uint8arrays"

import { PBLink } from "@ipld/dag-pb"
import { webcrypto } from "iso-base/crypto"
import { BlockStore, PrivateForest, PublicDirectory } from "wnfs"

import * as Crypto from "../common/crypto.js"
import * as SemVer from "../common/semver.js"
import * as Depot from "../components/depot/implementation.js"
import * as DAG from "../dag/index.js"
import * as Version from "./version.js"

import { CID } from "../common/cid.js"
import { RootBranch } from "../path/index.js"
import { makeRngInterface } from "./rng.js"

/**
 * The tree that ties different file systems together.
 *
 * Contains:
 * - `exchange`: A public directory exclusively to manage exchange keys.
 * - `private`: A private forest.
 * - `public`: A public directory.
 * - `unix`: A unix-fs copy of the public directory (to be used with IPFS gateways)
 * - `version`: The version of the root tree.
 */
export type RootTree = {
  exchangeRoot: PublicDirectory
  publicRoot: PublicDirectory
  privateForest: PrivateForest
  // TODO: unix: ?
  version: SemVer.SemVer
}

/**
 * Create a new `PrivateForest`
 */
export async function createPrivateForest(): Promise<PrivateForest> {
  const rng = makeRngInterface()
  const rsaKey = await Crypto.rsa.generateKey("sign")
  const rsaMod = await webcrypto.subtle
    .exportKey("jwk", rsaKey.publicKey)
    .then(a => {
      if (a.n) return a.n
      else throw new Error("Expected public RSA key to have `n` property")
    })
    .then(n => Uint8Arrays.fromString(n, "base64url"))

  return new PrivateForest(rng, rsaMod)
}

/**
 * Create a new `RootTree`.
 */
export async function empty(): Promise<RootTree> {
  const currentTime = new Date()

  return {
    exchangeRoot: new PublicDirectory(currentTime),
    publicRoot: new PublicDirectory(currentTime),
    privateForest: await createPrivateForest(),
    version: Version.v2,
  }
}

/**
 * Load an existing `RootTree`.
 */
export async function fromCID({ blockStore, cid, depot }: {
  blockStore: BlockStore
  cid: CID
  depot: Depot.Implementation
}): Promise<RootTree> {
  const currentTime = new Date()

  // Retrieve links
  const links = await linksFromCID(depot, cid)

  // Retrieve all pieces
  async function handleLink<T>(
    name: string,
    present: (cid: CID) => Promise<T>,
    missing: () => T | Promise<T>
  ): Promise<T> {
    if (links[name]) {
      return present(links[name])
    } else {
      console.warn(`Missing '${name}' link in the root tree from '${cid.toString()}'. Creating a new link.`)
      return await missing()
    }
  }

  const exchangeRoot = await handleLink(
    RootBranch.Exchange,
    (cid) => PublicDirectory.load(cid.bytes, blockStore),
    () => new PublicDirectory(currentTime)
  )

  const publicRoot = await handleLink(
    RootBranch.Public,
    (cid) => PublicDirectory.load(cid.bytes, blockStore),
    () => new PublicDirectory(currentTime)
  )

  const privateForest = await handleLink(
    RootBranch.Private,
    (cid) => PrivateForest.load(cid.bytes, blockStore),
    () => createPrivateForest()
  )

  const version = await handleLink(
    RootBranch.Version,
    async (cid) => {
      const string = new TextDecoder().decode(await DAG.getRaw(depot, cid))
      const semVer = SemVer.fromString(string)
      if (!semVer) throw new Error(`Invalid file system version detected '${string}'`)
      return semVer
    },
    () => Version.v2
  )

  // Compose
  return {
    exchangeRoot,
    publicRoot,
    privateForest,
    version,
  }
}

/**
 * Retrieve the links of a root tree.
 */
export async function linksFromCID(depot: Depot.Implementation, cid: CID): Promise<Record<string, CID>> {
  // Get the root node,
  // which is stored as DAG-PB.
  const node = await DAG.getPB(
    depot,
    cid
  )

  return node.Links.reduce((acc: Record<string, CID>, link: PBLink) => {
    return link.Name ? { ...acc, [link.Name]: link.Hash } : acc
  }, {})
}

/**
 * Store
 */
export async function store({ blockStore, depot, rootTree }: {
  blockStore: BlockStore
  depot: Depot.Implementation
  rootTree: RootTree
}): Promise<CID> {
  // Store all pieces
  const exchangeRoot = await rootTree.exchangeRoot.store(blockStore)
  const privateForest = await rootTree.privateForest.store(blockStore)
  const publicRoot = await rootTree.publicRoot.store(blockStore)

  const version = await depot.putBlock(
    Raw.encode(
      new TextEncoder().encode(
        SemVer.toString(rootTree.version)
      )
    ),
    Raw.code
  )

  // Store root tree
  const rootCID = await DAG.putPB(
    depot,
    [
      {
        Name: RootBranch.Exchange,
        Hash: CID.decode(exchangeRoot),
      },
      {
        Name: RootBranch.Private,
        Hash: CID.decode(privateForest),
      },
      {
        Name: RootBranch.Public,
        Hash: CID.decode(publicRoot),
      },
      {
        Name: RootBranch.Version,
        Hash: version,
      },
    ]
  )

  // Fin
  return rootCID
}
