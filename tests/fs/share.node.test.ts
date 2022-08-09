import * as cbor from "@ipld/dag-cbor"
import * as uint8arrays from "uint8arrays"
import { SymmAlg } from "keystore-idb/types.js"

import expect from "expect"
import { getPublicKey } from "keystore-idb/rsa/index.js"

import "../../src/setup/node.js"

import * as privateCheck from "../../src/fs/protocol/private/types/check.js"
import * as crypto from "../../src/crypto/index.js"
import * as did from "../../src/did/index.js"
import * as pathing from "../../src/path.js"
import * as protocol from "../../src/fs/protocol/index.js"
import * as sharingKey from "../../src/fs/protocol/shared/key.js"

import { Branch } from "../../src/path.js"
import { KeyType } from "../../src/did/types.js"
import { decodeCID } from "../../src/common/index.js"
import { emptyFilesystem } from "../helpers/filesystem.js"

import PrivateFile from "../../src/fs/v1/PrivateFile.js"
import PrivateTree from "../../src/fs/v1/PrivateTree.js"


describe("the filesystem", () => {

  it("creates shares", async function() {
    const fs = await emptyFilesystem()
    const counter = 12345678

    await fs.root.setSharedCounter(counter)

    // Test items
    const C = "🕵️‍♀️"
    const F = "🍻"

    await fs.write(pathing.file(Branch.Private, "a", "b", "c.txt"), C)
    await fs.write(pathing.file(Branch.Private, "a", "d", "e", "f.txt"), F)

    // Test identifiers
    const exchangeKeyPair = await crypto.rsa.genKey()
    const exchangePubKey = await getPublicKey(exchangeKeyPair)
    const exchangeDID = did.publicKeyToDid(exchangePubKey, KeyType.RSA)
    if (!exchangeKeyPair.privateKey) throw new Error("Missing private key in exchange key-pair")

    const senderKeyPair = await crypto.rsa.genKey()
    const senderPubKey = await getPublicKey(senderKeyPair)
    const senderDID = did.publicKeyToDid(senderPubKey, KeyType.RSA)

    // Create the `/shared` entries
    const itemC = await fs.get(pathing.file(Branch.Private, "a", "b", "c.txt"))
    const itemE = await fs.get(pathing.directory(Branch.Private, "a", "d", "e"))

    if (!PrivateFile.instanceOf(itemC)) throw new Error("Not a PrivateFile")
    if (!PrivateTree.instanceOf(itemE)) throw new Error("Not a PrivateTree")

    await fs.sharePrivate(
      [
        pathing.file(Branch.Private, "a", "b", "c.txt"),
        pathing.directory(Branch.Private, "a", "d", "e")
      ],
      {
        sharedBy: { rootDid: senderDID, username: "anonymous" },
        shareWith: [ exchangeDID ]
      }
    )

    // Test
    const shareKey = await sharingKey.create({
      counter: counter,
      recipientExchangeDid: exchangeDID,
      senderRootDid: senderDID
    })

    const createdLink = fs.root.sharedLinks[shareKey]
    const sharePayload = await protocol.basic.getFile(decodeCID(createdLink.cid))
    const decryptedPayload: Record<string, any> = await crypto.rsa.decrypt(
      sharePayload,
      exchangeKeyPair.privateKey
    ).then(a => cbor.decode(
      new Uint8Array(a)
    ))

    const entryIndexInfo = JSON.parse(new TextDecoder().decode(await crypto.aes.decrypt(
      await protocol.basic.getFile(decodeCID(decryptedPayload.cid)),
      uint8arrays.toString(decryptedPayload.key, "base64pad"),
      SymmAlg.AES_GCM
    )))

    if (!privateCheck.isPrivateTreeInfo(entryIndexInfo)) {
      throw new Error("Entry index is not a PrivateTree")
    }

    const entryIndex = await PrivateTree.fromInfo(
      fs.root.mmpt,
      decryptedPayload.symmKey,
      entryIndexInfo
    )

    const resultC: any = entryIndex.header.links["c.txt"]
    const resultE: any = entryIndex.header.links["e"]

    expect(resultC.privateName).toEqual(await itemC.getName())
    expect(resultE.privateName).toEqual(await itemE.getName())

    // Should increase the counter
    expect(fs.root.sharedCounter).toEqual(counter + 1)
  })

})
