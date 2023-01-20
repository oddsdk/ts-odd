import * as CBOR from "@ipld/dag-cbor"
import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as PrivateCheck from "../../src/fs/protocol/private/types/check.js"
import * as DID from "../../src/did/index.js"
import * as Path from "../../src/path/index.js"
import * as Protocol from "../../src/fs/protocol/index.js"
import * as SharingKey from "../../src/fs/protocol/shared/key.js"

import { SymmAlg } from "../../src/components/crypto/implementation.js"
import { components } from "../helpers/components.js"
import { decodeCID } from "../../src/common/index.js"
import { emptyFilesystem } from "../helpers/filesystem.js"

import PrivateFile from "../../src/fs/v1/PrivateFile.js"
import PrivateTree from "../../src/fs/v1/PrivateTree.js"

const wnfsWasmEnabled = process.env.WNFS_WASM != null
const itSkipInWasm = wnfsWasmEnabled ? it.skip : it


describe("the filesystem", () => {

  itSkipInWasm("creates shares", async function () {
    const fs = await emptyFilesystem()
    const counter = 12345678

    await fs.root.setSharedCounter(counter)

    // Test items
    const C = Uint8arrays.fromString("🕵️‍♀️", "utf8")
    const F = Uint8arrays.fromString("🍻", "utf8")

    await fs.write(Path.file("private", "a", "b", "c.txt"), C)
    await fs.write(Path.file("private", "a", "d", "e", "f.txt"), F)

    // Test identifiers
    const exchangeKeyPair = await components.crypto.rsa.genKey()
    const exchangePubKey = await components.crypto.rsa.exportPublicKey(exchangeKeyPair.publicKey)
    const exchangeDID = DID.publicKeyToDid(components.crypto, exchangePubKey, "rsa")
    if (!exchangeKeyPair.privateKey) throw new Error("Missing private key in exchange key-pair")

    const senderKeyPair = await components.crypto.rsa.genKey()
    const senderPubKey = await components.crypto.rsa.exportPublicKey(senderKeyPair.publicKey)
    const senderDID = DID.publicKeyToDid(components.crypto, senderPubKey, "rsa")

    // Create the `/shared` entries
    const itemC = await fs.get(Path.file("private", "a", "b", "c.txt"))
    const itemE = await fs.get(Path.directory("private", "a", "d", "e"))

    if (!PrivateFile.instanceOf(itemC)) throw new Error("Not a PrivateFile")
    if (!PrivateTree.instanceOf(itemE)) throw new Error("Not a PrivateTree")

    await fs.sharePrivate(
      [
        Path.file("private", "a", "b", "c.txt"),
        Path.directory("private", "a", "d", "e")
      ],
      {
        sharedBy: { rootDid: senderDID, username: "anonymous" },
        shareWith: [ exchangeDID ]
      }
    )

    // Test
    const shareKey = await SharingKey.create(components.crypto, {
      counter: counter,
      recipientExchangeDid: exchangeDID,
      senderRootDid: senderDID
    })

    const createdLink = fs.root.sharedLinks[ shareKey ]
    const sharePayload = await Protocol.basic.getFile(components.depot, decodeCID(createdLink.cid))
    const decryptedPayload: Record<string, any> = await components.crypto.rsa.decrypt(
      sharePayload,
      exchangeKeyPair.privateKey
    ).then(a => CBOR.decode(
      new Uint8Array(a)
    ))

    const entryIndexInfo = JSON.parse(
      new TextDecoder().decode(
        await components.crypto.aes.decrypt(
          await Protocol.basic.getFile(components.depot, decodeCID(decryptedPayload.cid)),
          decryptedPayload.key,
          SymmAlg.AES_GCM
        )
      )
    )

    if (!PrivateCheck.isPrivateTreeInfo(entryIndexInfo)) {
      throw new Error("Entry index is not a PrivateTree")
    }

    const entryIndex = await PrivateTree.fromInfo(
      components.crypto,
      components.depot,
      components.manners,
      components.reference,

      fs.root.mmpt,
      decryptedPayload.symmKey,
      entryIndexInfo
    )

    const resultC: any = entryIndex.header.links[ "c.txt" ]
    const resultE: any = entryIndex.header.links[ "e" ]

    expect(resultC.privateName).toEqual(await itemC.getName())
    expect(resultE.privateName).toEqual(await itemE.getName())

    // Should increase the counter
    expect(fs.root.sharedCounter).toEqual(counter + 1)
  })

})
