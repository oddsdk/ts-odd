import * as Uint8arrays from "uint8arrays"

import * as Crypto from "../../components/crypto/implementation.js"
import * as Depot from "../../components/depot/implementation.js"
import * as Protocol from "../protocol/index.js"

import MMPT from "../protocol/private/mmpt.js"

import { BareNameFilter } from "../protocol/private/namefilter.js"
import { DecryptedNode, Revision } from "../protocol/private/types.js"
import { Maybe, decodeCID } from "../../common/index.js"
import { Metadata } from "../metadata.js"


export interface Node {
  fromInfo: (mmpt: MMPT, key: Uint8Array, info: DecryptedNode) => Promise<Node>
  header: {
    bareNameFilter: BareNameFilter
    metadata: Metadata
    revision: number
  }
  key: Uint8Array
  mmpt: MMPT
}


export default class PrivateHistory {

  readonly node: Node

  crypto: Crypto.Implementation
  depot: Depot.Implementation

  constructor(crypto: Crypto.Implementation, depot: Depot.Implementation, node: Node) {
    this.crypto = crypto
    this.depot = depot
    this.node = node
  }

  /**
   * Go back one or more versions.
   *
   * @param delta Optional negative number to specify how far to go back
   */
  async back(delta = -1): Promise<Maybe<Node>> {
    const n = Math.min(delta, -1)
    const revision = this.node.header?.revision
    return (revision && await this._getRevision(revision + n)) || null
  }

  // async forward(delta: number = 1): Promise<Maybe<Node>> {
  //   const n = Math.max(delta, 1)
  //   const revision = this.node.header?.revision
  //   return (revision && await this._getRevision(revision + n)) || null
  // }

  /**
   * Get a version before a given timestamp.
   *
   * @param timestamp Unix timestamp in seconds
   */
  async prior(timestamp: number): Promise<Maybe<Node>> {
    if (this.node.header.metadata.unixMeta.mtime < timestamp) {
      return this.node
    } else {
      return this._prior(this.node.header.revision - 1, timestamp)
    }
  }

  /**
   * List earlier versions along with the timestamp they were created.
   */
  async list(amount = 5): Promise<Array<{ delta: number; timestamp: number }>> {
    const max = this.node.header.revision

    return Promise.all(
      Array.from({ length: amount }, (_, i) => {
        const n = i + 1
        return this._getRevisionInfoFromNumber(max - n).then(info => ({
          revisionInfo: info,
          delta: -n
        }))
      })
    ).then(
      list => list.filter(a => !!a.revisionInfo) as Array<{ revisionInfo: DecryptedNode; delta: number }>
    ).then(
      list => list.map(a => {
        const mtime = a.revisionInfo.metadata.unixMeta.mtime
        return { delta: a.delta, timestamp: mtime }
      })
    )
  }

  /**
   * @internal
   */
  async _getRevision(revision: number): Promise<Maybe<Node>> {
    const info = await this._getRevisionInfoFromNumber(revision)
    return info && await this.node.fromInfo(
      this.node.mmpt,
      this.node.key,
      info
    )
  }

  /**
   * @internal
   */
  _getRevisionInfo(revision: Revision): Promise<DecryptedNode> {
    return Protocol.priv.readNode(
      this.depot,
      this.crypto,
      decodeCID(revision.cid),
      this.node.key
    )
  }

  /**
   * @internal
   */
  async _getRevisionInfoFromNumber(revision: number): Promise<Maybe<DecryptedNode>> {
    const { mmpt } = this.node
    const { bareNameFilter } = this.node.header
    const key = this.node.key

    const r = await Protocol.priv.getRevision(this.crypto, mmpt, bareNameFilter, key, revision)
    return r && this._getRevisionInfo(r)
  }

  /**
   * @internal
   */
  async _prior(revision: number, timestamp: number): Promise<Maybe<Node>> {
    const info = await this._getRevisionInfoFromNumber(revision)
    if (!info?.revision) return null

    if (info.metadata.unixMeta.mtime < timestamp) {
      return this._getRevision(info.revision)
    } else {
      return this._prior(info.revision - 1, timestamp)
    }
  }

}
