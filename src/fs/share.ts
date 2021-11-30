import * as cbor from "@ipld/dag-cbor"
import { SymmAlg } from "keystore-idb/lib/types.js"

import * as basic from "./protocol/basic.js"
import * as crypto from "../crypto/index.js"
import * as dataRoot from "../data-root.js"
import * as ipfs from "../ipfs/basic.js"
import * as pathing from "../path.js"
import * as protocol from "./protocol/index.js"
import * as shareKey from "./protocol/shared/key.js"

import { Branch, DirectoryPath } from "../path.js"
import { SharedBy, ShareDetails } from "./types.js"
import { didToPublicKey } from "../did/transformers.js"
import BareTree from "./bare/tree.js"
import PrivateFile from "./v1/PrivateFile.js"
import PrivateTree from "./v1/PrivateTree.js"
import RootTree from "./root/tree.js"


// CONSTANTS


export const EXCHANGE_PATH: DirectoryPath = pathing.directory(
  pathing.Branch.Public,
  ".well-known",
  "exchange"
)



// FUNCTIONS


export async function privateNode(
  rootTree: RootTree,
  items: Array<[string, PrivateTree | PrivateFile]>,
  { shareWith, sharedBy }: {
    shareWith: string | string[],
    sharedBy: SharedBy
  }
): Promise<ShareDetails> {
  const exchangeDIDs = Array.isArray(shareWith)
    ? shareWith
    : shareWith.startsWith("did:")
      ? [ shareWith ]
      : await listExchangeDIDs(shareWith)

  const counter = rootTree.sharedCounter || 0
  const mmpt = rootTree.mmpt

  // Create share keys
  const shareKeysWithDIDs: [string, string][] = await Promise.all(exchangeDIDs.map(async did => {
    return [
      did,
      await shareKey.create({
        counter,
        recipientExchangeDid: did,
        senderRootDid: sharedBy.rootDid
      })
    ] as [string, string]
  }))

  // Create entry index
  const indexKey = await crypto.aes.genKeyStr()
  const index = await PrivateTree.create(mmpt, indexKey, null)

  await Promise.all(
    items.map(async ([name, item]) => {
      const privateName = await item.getName()
      return index.insertSoftLink({
        key: item.key,
        name,
        privateName,
        username: sharedBy.username
      })
    })
  )

  // Add entry index to ipfs
  const symmKeyAlgo = SymmAlg.AES_GCM
  const indexNode = Object.assign({}, index.header)
  const indexResult = await basic.putFile(
    await crypto.aes.encrypt(
      new TextEncoder().encode( JSON.stringify(indexNode) ),
      index.key,
      symmKeyAlgo
    )
  )

  // Create share payload
  const payload = cbor.encode(shareKey.payload({
    entryIndexCid: indexResult.cid,
    symmKey: index.key,
    symmKeyAlgo
  }))

  // Add encrypted payloads to ipfs
  const links = await Promise.all(shareKeysWithDIDs.map(async ([did, shareKey]) => {
    const { publicKey } = didToPublicKey(did)
    const encryptedPayload = await crypto.rsa.encrypt(payload, publicKey)
    const result = await ipfs.add(encryptedPayload)

    return {
      name: shareKey,
      cid: result.cid,
      size: result.size
    }
  }))

  // Add shares to filesystem
  await rootTree.addShares(links)

  // Fin
  return { shareId: counter.toString(), sharedBy }
}


export async function listExchangeDIDs(username: string) {
  const root = await dataRoot.lookup(username)
  if (!root) throw new Error("This person doesn't have a filesystem yet.")

  const rootLinks = await protocol.basic.getSimpleLinks(root)
  const prettyTreeCid = rootLinks[Branch.Pretty]?.cid || null
  if (!prettyTreeCid) throw new Error("This person's filesystem doesn't have a pretty tree.")

  const tree = await BareTree.fromCID(prettyTreeCid)
  const exchangePath = pathing.unwrap(pathing.removeBranch(EXCHANGE_PATH))
  const exchangeTree = await tree.get(exchangePath)

  return exchangeTree && exchangeTree instanceof BareTree
    ? Object.keys(exchangeTree.getLinks())
    : []
}
