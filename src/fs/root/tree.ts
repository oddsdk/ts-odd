import { Branch, Links, Puttable } from '../types'
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

  publicTree: PublicTree
  prettyTree: BareTree
  privateTree: PrivateTree

  constructor({ links, mmpt, publicTree, prettyTree, privateTree }: {
    links: Links,
    mmpt: MMPT,

    publicTree: PublicTree,
    prettyTree: BareTree,
    privateTree: PrivateTree,
  }) {
    this.links = links
    this.mmpt = mmpt

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

    // Construct tree
    const tree = new RootTree({
      links,
      mmpt,

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
  //
  // {
  //   "currentChunkIndex": 2,
  //   "0": first_log,
  //   "1": second_log,
  //   "2": current_log
  // }
  //
  // Chunk size is based on the default IPFS block size,
  // which is 1024 * 256 bytes. 1 log chunk should fit in 1 block.
  // We'll use the CSV format for the data in the chunks.
  static LOG_CHUNK_SIZE = 1020 // Math.floor((1024 * 256) / (256 + 1))


  async addPrivateLogEntry(cid: string): Promise<void> {
    const logCid = this.links[Branch.PrivateLog]?.cid
    const log = logCid ? await protocol.basic.getSimpleLinks(logCid) : {}

    // current chunk index
    let currentChunkIndex = log.currentChunkIndex?.cid
      ? JSON.parse(await ipfs.cat(log.currentChunkIndex?.cid)) || 0
      : 0

    // get current chunk
    let currentChunk = log[currentChunkIndex]?.cid
      ? (await ipfs.cat(log[currentChunkIndex]?.cid)).split(",")
      : []

    // needs new chunk
    const needsNewChunk = currentChunk.length + 1 > RootTree.LOG_CHUNK_SIZE

    if (needsNewChunk) {
      currentChunkIndex = currentChunkIndex + 1
      currentChunk = []
    }

    if (needsNewChunk || !log.currentChunkIndex) {
      const currentChunkIndexDeposit = await protocol.basic.putFile(
        JSON.stringify(currentChunkIndex)
      )

      const currentChunkIndexLink = link.make(
        "currentChunkIndex",
        currentChunkIndexDeposit.cid,
        currentChunkIndexDeposit.isFile,
        currentChunkIndexDeposit.size
      )

      log.currentChunkIndex = currentChunkIndexLink
    }

    // add to chunk
    const hashedCid = await sha256Str(cid)
    const updatedChunk = [...currentChunk, hashedCid]
    const updatedChunkDeposit = await protocol.basic.putFile(
      updatedChunk.join(",")
    )

    const updatedChunkLink = link.make(
      currentChunkIndex.toString(),
      updatedChunkDeposit.cid,
      updatedChunkDeposit.isFile,
      updatedChunkDeposit.size
    )

    log[currentChunkIndex.toString()] = updatedChunkLink

    // save log
    const logDeposit = await protocol.basic.putLinks(log)
    this.updateLink(Branch.PrivateLog, logDeposit)
  }


  // VERSION
  // -------

  async setVersion(version: SemVer): Promise<this> {
    const result = await protocol.basic.putFile(semver.toString(version))
    return this.updateLink(Branch.Version, result)
  }

}
