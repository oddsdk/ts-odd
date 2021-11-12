/** @internal */
import type { ImportCandidate } from "ipfs-core-types/src/utils"
import dagPb from "ipld-dag-pb"

import * as ipfs from "../../ipfs/index.js"
import { CID, FileContent, AddResult } from "../../ipfs/index.js"
import { DAG_NODE_DATA } from "../../ipfs/constants.js"

import { SimpleLinks, Links } from "../types.js"
import * as check from "../types/check.js"
import * as link from "../link.js"
import * as typeCheck from "../../common/type-checks.js"


export const getFile = async (cid: CID): Promise<Uint8Array> => {
  return ipfs.catBuf(cid)
}

export const getEncryptedFile = async (cid: CID, key: string): Promise<FileContent> => {
  return ipfs.encoded.catAndDecode(cid, key) as Promise<FileContent>
}

export const putFile = async (content: ImportCandidate): Promise<AddResult> => {
  return ipfs.add(content)
}

export const putEncryptedFile = async (content: FileContent, key: string): Promise<AddResult> => {
  return ipfs.encoded.add(content, key)
}

export const getSimpleLinks = async (cid: CID): Promise<SimpleLinks> => {
  const dagNode = await ipfs.dagGet(cid)
  return link.arrToMap(
    dagNode.Links.map(link.fromDAGLink)
  )
}

export const getFileSystemLinks = async (cid: CID): Promise<Links> => {
  const topNode = await ipfs.dagGet(cid)
  const links = await Promise.all(topNode.Links.map(async l => {
    const innerNode = await ipfs.dagGet(l.Hash.toString())
    const innerLinks = link.arrToMap(innerNode.Links.map(link.fromDAGLink))
    const isSoftLink = !!innerLinks["softLink"]

    if (isSoftLink) {
      const a = await ipfs.catBuf(innerLinks["softLink"].cid)
      const b = new TextDecoder().decode(a)
      return JSON.parse(b)
    }

    const f = await ipfs.encoded.catAndDecode(
      innerLinks["metadata"].cid,
      null
    )

    return {
      ...link.fromDAGLink(l),
      isFile: typeCheck.hasProp(f, "isFile") ? f.isFile : false
    }
  }))

  return link.arrToMap(links)
}

export const putLinks = async (links: Links | SimpleLinks): Promise<AddResult> => {
  const dagLinks = Object.values(links)
    .filter(l => l !== undefined)
    .map(async l => {
      if (check.isSoftLink(l)) {
        const softLink = await ipfs.add(JSON.stringify(l))
        const dagNode = await ipfs.dagPut(
          new dagPb.DAGNode(DAG_NODE_DATA, [ new dagPb.DAGLink("softLink", softLink.size, softLink.cid) ])
        )
        return new dagPb.DAGLink(l.name, dagNode.size, dagNode.cid)
      } else if (l.Hash) {
        return l
      } else {
        return link.toDAGLink(l)
      }
    })
  return ipfs.dagPutLinks(await Promise.all(dagLinks))
}
