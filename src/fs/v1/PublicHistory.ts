import { CID } from '../../ipfs'
import { Maybe } from '../../common'
import { Metadata } from '../metadata'
import * as protocol from '../protocol'


export type Node = {
  constructor: {
    fromCID: (cid: CID) => Node
  },
  header: {
    metadata: Metadata,
    previous: CID
  }
}


export default class PublicHistory {

  constructor(readonly node: Node) {}

  /**
   * Go back one or more versions.
   *
   * @param delta Optional negative number to specify how far to go back
   */
  back(delta: number = -1): Promise<Maybe<Node>> {
    const length = Math.abs(Math.min(delta, -1))

    return Array.from({ length }, (_, i) => i).reduce(
      (promise: Promise<Maybe<Node>>) => promise.then(
        (n: Maybe<Node>) => n ? PublicHistory._getPreviousVersion(n) : null
      ),
      Promise.resolve(this.node)
    )
  }

  // async forward(delta: number = 1): Promise<Maybe<Node>> {}

  /**
   * Get a version before a given timestamp.
   *
   * @param timestamp Unix timestamp in seconds
   */
  async prior(timestamp: number): Promise<Maybe<Node>> {
    return PublicHistory._prior(this.node, timestamp)
  }

  /**
   * List earlier versions along with the timestamp they were created.
   */
  async list(amount: number = 5): Promise<Array<{ delta: number, timestamp: number }>> {
    const { acc } = await Array.from({ length: amount }, (_, i) => i).reduce(
      (promise, i) => promise.then(({ node, acc }) => {
        if (!node) return Promise.resolve({ node: null, acc })

        return PublicHistory
          ._getPreviousVersion(node)
          .then(n => ({
            node: n,
            acc: [
              ...acc,
              { delta: -(i + 1), timestamp: node.header.metadata.unixMeta.mtime }
            ]
          }))
      }),
      PublicHistory
        ._getPreviousVersion(this.node)
        .then(n => (
          { node: n, acc: [] } as {
            node: Maybe<Node>,
            acc: Array<{ delta: number, timestamp: number }>
          }
        ))
    )

    return acc
  }

  /**
   * @internal
   */
  static async _getPreviousVersion(node: Node): Promise<Maybe<Node>> {
    if (!node.header.previous) return Promise.resolve(null)
    return node.constructor.fromCID(node.header.previous)
  }

  /**
   * @internal
   */
  static async _prior(node: Node, timestamp: number): Promise<Maybe<Node>> {
    if (node.header.metadata.unixMeta.mtime < timestamp) return node
    const previous = await PublicHistory._getPreviousVersion(node)
    return previous ? PublicHistory._prior(previous, timestamp) : null
  }

}
