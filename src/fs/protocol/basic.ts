import * as DagCBOR from "@ipld/dag-cbor"
import * as DagPB from "@ipld/dag-pb"
import * as Uint8arrays from "uint8arrays"
import { CID } from "multiformats/cid"

import * as Blob from "../../common/blob.js"
import * as Crypto from "../../components/crypto/implementation.js"
import * as DAG from "../../dag/index.js"
import * as Depot from "../../components/depot/implementation.js"

import * as FsTypeCheck from "../types/check.js"
import * as Link from "../link.js"
import * as TypeCheck from "../../common/type-checks.js"
import { SimpleLinks, Links, SimpleLink, HardLink, SoftLink, BaseLink } from "../types.js"
import { SymmAlg } from "../../components/crypto/implementation.js"
import { decodeCID } from "../../common/index.js"


export const DEFAULT_AES_ALG = SymmAlg.AES_CTR


export const getFile = async (depot: Depot.Implementation, cid: CID): Promise<Uint8Array> => {
  return depot.getUnixFile(cid)
}

export const getEncryptedFile = async (depot: Depot.Implementation, crypto: Crypto.Implementation, cid: CID, key: Uint8Array): Promise<Uint8Array> => {
  const buf = await getFile(depot, cid)

  // NOTE: Somehow the try/catch is needed by the integration test with the CAR file.
  //       Maybe a mistake in the CAR file or how the file system code worked before?
  let withAlgorithm

  try {
    withAlgorithm = DagCBOR.decode(buf)
  } catch {
    // Not CBOR?
    return buf
  }

  if (!TypeCheck.hasProp(withAlgorithm, "alg") || !TypeCheck.hasProp(withAlgorithm, "cip") || !isSymmAlg(withAlgorithm.alg) || !ArrayBuffer.isView(withAlgorithm.cip)) {
    throw new Error(`Unexpected private block. Expected "alg" and "cip" field.`)
  }

  const alg = withAlgorithm.alg
  const cip = new Uint8Array(withAlgorithm.cip.buffer)
  const toDecode = await crypto.aes.decrypt(cip, key, alg)

  const decoded = DagCBOR.decode(toDecode)
  if (decoded instanceof Uint8Array) return decoded
  if (typeof decoded === "string") return Uint8arrays.fromString(decoded, "utf8")

  // Legacy
  return Uint8arrays.fromString(JSON.stringify(decoded), "utf8")
}

export const putFile = async (depot: Depot.Implementation, content: Uint8Array): Promise<Depot.PutResult> => {
  return depot.putChunked(content)
}

export const putEncryptedFile = async (depot: Depot.Implementation, crypto: Crypto.Implementation, content: Uint8Array | Object, key: Uint8Array): Promise<Depot.PutResult> => {
  const normalized = TypeCheck.isBlob(content) ? await Blob.toUint8Array(content) : content
  const encoded = DagCBOR.encode(normalized)

  const alg = SymmAlg.AES_GCM
  const cip = await crypto.aes.encrypt(encoded, key, alg)
  const toAdd = DagCBOR.encode({ alg, cip })

  return putFile(depot, toAdd)
}

export const getSimpleLinks = async (depot: Depot.Implementation, cid: CID): Promise<SimpleLinks> => {
  const dagNode = await DAG.getPB(depot, cid)

  return Link.arrToMap(
    dagNode.Links.map(Link.fromDAGLink)
  )
}

export const getFileSystemLinks = async (depot: Depot.Implementation, cid: CID): Promise<Links> => {
  const topNode = await DAG.getPB(depot, cid)

  const links = await Promise.all(topNode.Links.map(async l => {
    const innerNode = await DAG.getPB(depot, l.Hash)
    const innerLinks = Link.arrToMap(innerNode.Links.map(Link.fromDAGLink))
    const isSoftLink = !!innerLinks[ "softLink" ]

    if (isSoftLink) {
      const a = await depot.getUnixFile(decodeCID(innerLinks[ "softLink" ].cid))
      const b = new TextDecoder().decode(a)
      return JSON.parse(b)
    }

    const f = await DagCBOR.decode(
      await getFile(
        depot,
        decodeCID(innerLinks[ "metadata" ].cid)
      )
    )

    return {
      ...Link.fromDAGLink(l),
      isFile: TypeCheck.hasProp(f, "isFile") ? f.isFile : false
    }
  }))

  return Link.arrToMap(links)
}

export const putLinks = async (
  depot: Depot.Implementation,
  links: Links | SimpleLinks
): Promise<Depot.PutResult> => {
  const dagLinks = Object
    .values(links)
    .reduce(async (acc: Promise<DagPB.PBLink[]>, l: HardLink | SoftLink | BaseLink | SimpleLink) => {
      const arr = await acc

      if (FsTypeCheck.isSoftLink(l)) {
        const softLink = await depot.putChunked(
          Uint8arrays.fromString(
            JSON.stringify(l),
            "utf8"
          )
        )

        const dagNodeCID = await DAG.putPB(depot, [
          DagPB.createLink("softLink", softLink.size, softLink.cid)
        ])

        const dagNodeSize = await depot.size(dagNodeCID)

        return [ ...arr, DagPB.createLink(l.name, dagNodeSize, dagNodeCID) ]
      } else if (TypeCheck.hasProp(l, "Hash") && l.Hash) {
        return [ ...arr, l as DagPB.PBLink ]
      } else if (FsTypeCheck.isSimpleLink(l)) {
        return [ ...arr, Link.toDAGLink(l) ]
      } else {
        return arr
      }
    }, Promise.resolve([]))



  const cid = await DAG.putPB(
    depot,
    await dagLinks
  )

  return {
    cid,
    isFile: false,
    size: await depot.size(cid)
  }
}



// ㊙️


function isSymmAlg(alg: unknown): alg is SymmAlg {
  return TypeCheck.isString(alg) && (Object.values(SymmAlg) as string[]).includes(alg as string)
}