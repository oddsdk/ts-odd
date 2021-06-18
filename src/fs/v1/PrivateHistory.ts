import MMPT from "../protocol/private/mmpt"
import { BareNameFilter } from '../protocol/private/namefilter'
import { DecryptedNode, Revision } from "../protocol/private/types"
import { Maybe } from '../../common'
import { Metadata } from '../metadata'
import * as protocol from '../protocol'


export type Node = {
  constructor: {
    fromInfo: (mmpt: MMPT, key: string, info: DecryptedNode) => Node
  },
  header: {
    bareNameFilter: BareNameFilter,
    metadata: Metadata,
    revision: number
  },
  key: string,
  mmpt: MMPT
}


export default class PrivateHistory {

  constructor(readonly node: Node) {}

  /**
   * Go back one or more versions.
   *
   * @param delta Optional negative number to specify how far to go back
   */
  async back(delta: number = -1): Promise<Maybe<Node>> {
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
  async list(amount: number = 5): Promise<Array<{ delta: number, timestamp: number }>> {
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
      list => list.filter(a => !!a.revisionInfo) as Array<{ revisionInfo: DecryptedNode, delta: number }>
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
    return info && await this.node.constructor.fromInfo(
      this.node.mmpt,
      this.node.key,
      info
    )
  }

  /**
   * @internal
   */
  _getRevisionInfo(revision: Revision): Promise<DecryptedNode> {
    return protocol.priv.readNode(revision.cid, this.node.key)
  }

  /**
   * @internal
   */
  async _getRevisionInfoFromNumber(revision: number): Promise<Maybe<DecryptedNode>> {
    const { key, mmpt } = this.node
    const { bareNameFilter } = this.node.header

    const r = await protocol.priv.getRevision(mmpt, bareNameFilter, key, revision)
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
