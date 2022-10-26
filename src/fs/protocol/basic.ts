import * as DagPB from "@ipld/dag-pb"
import * as Uint8arrays from "uint8arrays"
import { CID } from "multiformats/cid"

import * as DAG from "../../dag/index.js"
import * as Depot from "../../components/depot/implementation.js"

import * as FsTypeCheck from "../types/check.js"
import * as Link from "../link.js"
import * as TypeCheck from "../../common/type-checks.js"
import { SimpleLinks, Links, SimpleLink, HardLink, SoftLink, BaseLink } from "../types.js"
import { decodeCID } from "../../common/index.js"


export const getFile = async (cid: CID): Promise<Uint8Array> => {
  return ipfs.catBuf(cid)
}

export const getEncryptedFile = async (cid: CID, key: string): Promise<FileContent> => {
  return ipfs.encoded.catAndDecode(cid, key) as Promise<FileContent>
}

export const putFile = async (content: Uint8Array): Promise<AddResult> => {
  return ipfs.add(content)
}

export const putEncryptedFile = async (content: FileContent, key: string): Promise<AddResult> => {
  return ipfs.encoded.add(content, key)
}

export const getSimpleLinks = async (cid: CID): Promise<SimpleLinks> => {
  const dagNode = await ipfs.dagGet(cid)
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

    const f = await ipfs.encoded.catAndDecode(
      decodeCID(innerLinks[ "metadata" ].cid),
      null
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
  const dagLinks: Promise<DagPB.PBLink | null>[] = Object
    .values(links)
    .map(async (l: HardLink | SoftLink | BaseLink | SimpleLink) => {
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

        return DagPB.createLink(l.name, dagNodeSize, dagNodeCID)
      } else if (TypeCheck.hasProp(l, "Hash") && l.Hash) {
        return l as DagPB.PBLink
      } else if (FsTypeCheck.isSimpleLink(l)) {
        return Link.toDAGLink(l)
      } else {
        return null
      }
    })

  const cid = await DAG.putPB(
    depot,
    await Promise.all(dagLinks).then(l => l.filter(a => a !== null))
  )

  return {
    cid,
    isFile: false,
    size: await depot.size(cid)
  }
}
