import { Branch, Links, Puttable, SimpleLink } from '../types'
import { AddResult, CID } from '../../ipfs'
import { SemVer } from '../semver'
import { sha256Str } from '../../keystore'
import * as ipfs from '../../ipfs'
import * as link from '../link'
import * as protocol from '../protocol'
import * as semver from '../semver'
import BareTree from '../bare/tree'
import MMPT from '../protocol/private/mmpt'
import PublicTree from '../v1/PublicTree'
import PrivateTree from '../v1/PrivateTree'


export default class RootTree implements Puttable {

  links: Links
  mmpt: MMPT
  privateLog: Array<SimpleLink>

  publicTree: PublicTree
  prettyTree: BareTree
  privateTree: PrivateTree

  constructor({ links, mmpt, privateLog, publicTree, prettyTree, privateTree }: {
    links: Links,
    mmpt: MMPT,
    privateLog: Array<SimpleLink>,

    publicTree: PublicTree,
    prettyTree: BareTree,
    privateTree: PrivateTree,
  }) {
    this.links = links
    this.mmpt = mmpt
    this.privateLog = privateLog

    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
  }


  // INITIALISATION
  // --------------

  static async empty({ key }: { key: string }): Promise<RootTree> {
    const publicTree = await PublicTree.empty()
    const prettyTree = await BareTree.empty()

    const mmpt = MMPT.create()
    const privateTree = await PrivateTree.create(mmpt, key, null)
    await privateTree.put()

    // Construct tree
    const tree = new RootTree({
      links: {},
      mmpt,
      privateLog: [],

      publicTree,
      prettyTree,
      privateTree
    })

    // Set version and store new sub trees
    tree.setVersion(semver.v1)

    await Promise.all([
      tree.updatePuttable(Branch.Public, publicTree),
      tree.updatePuttable(Branch.Pretty, prettyTree),
      tree.updatePuttable(Branch.Private, mmpt)
    ])

    // Fin
    return tree
  }

  static async fromCID({ cid, key }: { cid: CID, key: string }): Promise<RootTree> {
    const links = await protocol.basic.getLinks(cid)

    // Load public parts
    const publicCID = links[Branch.Public]?.cid || null
    const publicTree = publicCID === null
      ? await PublicTree.empty()
      : await PublicTree.fromCID(publicCID)

    const prettyTree = links[Branch.Pretty]
                         ? await BareTree.fromCID(links[Branch.Pretty].cid)
                         : await BareTree.empty()

    // Load private bits
    const privateCID = links[Branch.Private]?.cid || null

    let mmpt, privateTree
    if (privateCID === null) {
      mmpt = await MMPT.create()
      privateTree = await PrivateTree.create(mmpt, key, null)
    } else {
      mmpt = await MMPT.fromCID(privateCID)
      privateTree = await PrivateTree.fromBaseKey(mmpt, key)
    }

    const privateLogCid = links[Branch.PrivateLog]?.cid
    const privateLog = privateLogCid
      ? await ipfs.dagGet(privateLogCid)
          .then(dagNode => dagNode.Links.map(link.fromDAGLink))
          .then(links => links.sort((a, b) => {
            return parseInt(a.name, 10) - parseInt(b.name, 10)
          }))
      : []

    // Construct tree
    const tree = new RootTree({
      links,
      mmpt,
      privateLog,

      publicTree,
      prettyTree,
      privateTree
    })

    // Fin
    return tree
  }


  // MUTATIONS
  // ---------

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<AddResult> {
    return protocol.basic.putLinks(this.links)
  }

  updateLink(name: string, result: AddResult): this {
    const { cid, size, isFile } = result
    this.links[name] = link.make(name, cid, isFile, size)
    return this
  }

  async updatePuttable(name: string, puttable: Puttable): Promise<this> {
    return this.updateLink(name, await puttable.putDetailed())
  }


  // PRIVATE LOG
  // -----------
  // CBOR array containing chunks.
  //
  // Chunk size is based on the default IPFS block size,
  // which is 1024 * 256 bytes. 1 log chunk should fit in 1 block.
  // We'll use the CSV format for the data in the chunks.
  static LOG_CHUNK_SIZE = 1020 // Math.floor((1024 * 256) / (256 + 1))


  async addPrivateLogEntry(cid: string): Promise<void> {
    const log = [...this.privateLog]
    let idx = Math.max(0, log.length - 1)

    // get last chunk
    let lastChunk = log[idx]?.cid
      ? (await ipfs.cat(log[idx].cid)).split(",")
      : []

    // needs new chunk
    const needsNewChunk = lastChunk.length + 1 > RootTree.LOG_CHUNK_SIZE
    if (needsNewChunk) {
      idx = idx + 1
      lastChunk = []
    }

    // add to chunk
    const hashedCid = await sha256Str(cid)
    const updatedChunk = [...lastChunk, hashedCid]
    const updatedChunkDeposit = await protocol.basic.putFile(
      updatedChunk.join(",")
    )

    log[idx] = {
      name: idx.toString(),
      cid: updatedChunkDeposit.cid,
      size: updatedChunkDeposit.size
    }

    // save log
    const logDeposit = await ipfs.dagPutLinks(
      log.map(link.toDAGLink)
    )

    this.updateLink(Branch.PrivateLog, {
      cid: logDeposit.cid,
      isFile: false,
      size: await ipfs.size(logDeposit.cid)
    })

    this.privateLog = log
  }


  // VERSION
  // -------

  async setVersion(version: SemVer): Promise<this> {
    const result = await protocol.basic.putFile(semver.toString(version))
    return this.updateLink(Branch.Version, result)
  }

}
