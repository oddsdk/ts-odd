import type { CID } from "multiformats/cid"

import * as Basic from "../basic.js"
import * as Depot from "../../../components/depot/implementation.js"
import * as Link from "../../link.js"

import { Puttable, SimpleLinks } from "../../types.js"
import { decodeCID } from "../../../common/index.js"


const nibbles = {
  "0": true, "1": true, "2": true, "3": true, "4": true, "5": true, "6": true, "7": true,
  "8": true, "9": true, "a": true, "b": true, "c": true, "d": true, "e": true, "f": true,
} as { [ key: string ]: boolean }
const isNibble = (str: string): boolean => nibbles[ str ] === true

type Member = {
  name: string
  cid: CID
}

/**
 * Modified Merkle Patricia Tree
 * The tree has a node weight of 16
 * It stores items with hexidecimal keys and creates a new layer when a given layer has two keys that start with the same nibble
 */
export default class MMPT implements Puttable {

  depot: Depot.Implementation

  links: SimpleLinks
  children: { [ name: string ]: MMPT }

  constructor(depot: Depot.Implementation, links: SimpleLinks) {
    this.links = links
    this.children = {}
    this.depot = depot
  }

  static create(depot: Depot.Implementation): MMPT {
    return new MMPT(depot, {})
  }

  static async fromCID(depot: Depot.Implementation, cid: CID): Promise<MMPT> {
    const links = await Basic.getSimpleLinks(depot, cid)
    return new MMPT(depot, links)
  }

  async putDetailed(): Promise<Depot.PutResult> {
    return Basic.putLinks(this.depot, this.links)
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async add(name: string, value: CID): Promise<void> {
    if (!isNibble(name[ 0 ])) {
      throw new Error(`Not a valid name, must be hexadecimal`)
    }
    const nextNameOrSib = this.nextTreeOrSiblingName(name)

    // if already in tree, then skip
    if (name === nextNameOrSib) {
      // if (this.links[ name ]?.cid !== value) {
      //   this.manners.warn(`Adding \`${name}\` to the MMPT again with a different value. This should not happen. The original value will still be used and can loading issues. Current CID is \`${this.links[ name ]?.cid}\`, new CID is \`${value}\`.`)
      // } else {
      //   // skip
      // }
    }

    // if no children starting with first char of name, then add with entire name as key
    else if (nextNameOrSib === null) {
      this.links[ name ] = Link.make(name, value, true, 0)
    }

    // if multiple children with first char of names, then add to that tree
    else if (nextNameOrSib.length === 1) {
      const nextTree = await this.getDirectChild(nextNameOrSib)
      await nextTree.add(name.slice(1), value)
      await this.putAndUpdateChildLink(nextNameOrSib)
    }

    // if one other child with first char of name, then put both into a child tree
    else {
      const newTree = this.addEmptyChild(name[ 0 ])
      const nextCID = this.links[ nextNameOrSib ].cid
      this.removeChild(nextNameOrSib)
      await Promise.all([
        newTree.add(name.slice(1), value),
        newTree.add(nextNameOrSib.slice(1), decodeCID(nextCID))
      ])
      await this.putAndUpdateChildLink(name[ 0 ])
    }
  }

  async putAndUpdateChildLink(name: string): Promise<void> {
    const cidBefore = this.links[ name ]?.cid
    const { cid, size } = await this.children[ name ].putDetailed()
    const cidNow = this.links[ name ]?.cid

    if (cidBefore != cidNow) {
      // If there are changes in-between, we have to
      // re-try updating. Otherwise we can overwrite changes that
      // a concurrent update made
      return await this.putAndUpdateChildLink(name)
    }

    this.links[ name ] = Link.make(name, cid, false, size)
  }

  addEmptyChild(name: string): MMPT {
    const tree = MMPT.create(this.depot)
    this.children[ name ] = tree
    return tree
  }

  async get(name: string): Promise<CID | null> {
    const nextName = this.nextTreeName(name)
    if (nextName === null) return null
    if (nextName.length > 1) {
      return decodeCID(this.links[ nextName ].cid)
    }
    const nextTree = await this.getDirectChild(nextName)
    return nextTree.get(name.slice(1))
  }

  async exists(name: string): Promise<boolean> {
    return (await this.get(name)) !== null
  }

  async members(): Promise<Array<Member>> {
    const children = await Promise.all(
      Object.values(this.links).map(async ({ name, cid }) => {
        if (name.length > 1) {
          return [ { name, cid: decodeCID(cid) } ]
        }
        const child = await MMPT.fromCID(this.depot, decodeCID(cid))
        const childMembers = await child.members()
        return childMembers.map(mem => ({
          ...mem,
          name: name + mem.name
        }))
      })
    )
    return children.reduce((acc, cur) => acc.concat(cur))
  }

  private async getDirectChild(name: string): Promise<MMPT> {
    if (this.children[ name ]) {
      return this.children[ name ]
    }

    const child = await MMPT.fromCID(
      this.depot,
      decodeCID(this.links[ name ].cid)
    )

    // check that the child wasn't added while retrieving the mmpt from the network
    if (this.children[ name ]) {
      return this.children[ name ]
    }

    this.children[ name ] = child
    return child
  }

  private removeChild(name: string): void {
    delete this.links[ name ]
    if (this.children[ name ]) {
      delete this.children[ name ]
    }
  }

  private directChildExists(name: string): boolean {
    return this.links[ name ] !== undefined || this.children[ name ] !== undefined
  }

  private nextTreeName(name: string): string | null {
    if (this.directChildExists(name[ 0 ])) {
      return name[ 0 ]
    } else if (this.directChildExists(name)) {
      return name
    }
    return null
  }

  private nextTreeOrSiblingName(name: string): string | null {
    const nibble = name[ 0 ]
    if (this.directChildExists(nibble)) {
      return nibble
    }
    return Object.keys(this.links).find(child => nibble === child[ 0 ]) || null
  }
}
