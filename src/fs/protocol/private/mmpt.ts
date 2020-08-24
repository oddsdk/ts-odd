import { AddResult, CID } from "../../../ipfs"
import * as basic from '../basic'
import * as link from '../../link'
import { Links } from '../../types'

const nibbles = { "0": true, "1": true, "2": true, "3": true, "4": true, "5": true, "6": true, "7": true,
                  "8": true, "9": true, "a": true, "b": true, "c": true, "d": true, "e": true, "f": true,
                } as {[key: string]: boolean}
const isNibble = (str: string): boolean => nibbles[str] === true


/**
 * Modified Merkle Patricia Tree
 * The tree has a node weight of 16
 * It stores items with hexidecimal keys and creates a new layer when a given layer has two keys that start with the same nibble
 */
export default class MMPT {

  links: Links

  constructor(links: Links) {
    this.links = links
  }
  
  static create(): MMPT {
    return new MMPT({})
  }

  static async fromCID(cid: CID): Promise<MMPT> {
    const links = await basic.getLinks(cid)
    return new MMPT(links)
  }

  async put(): Promise<AddResult> {
    return basic.putLinks(this.links)
  }

  async add(name: string, value: CID): Promise<this> {
    if(!isNibble(name[0])) {
      throw new Error(`Not a valid name, must be hexadecimal`)
    }
    const nextName = this.nextTreeOrSibling(name)

    // if already in tree, then skip
    if(name === nextName){
      return this
    }

    // if no children starting with first char of name, then add with entire name as key
    else if(nextName === null) {
      this.links[name] = link.make(name, value, true, 0)
      return this
    }

    // if multiple children with first char of names, then add to that tree
    if(nextName.length === 1){
      const nextTree = await MMPT.fromCID(this.links[nextName].cid)
      await nextTree.add(name.slice(1), value)
      const { cid, size } = await  nextTree.put()
      this.links[nextName] = link.make(nextName, cid, false, size)
      return this
    }
    
    // if one other child with first char of name, then put both into a child tree
    const tree = MMPT.create()
    await tree.add(name.slice(1), value)
    await tree.add(nextName.slice(1), this.links[nextName].cid)
    const { cid, size } = await tree.put()
    this.links[name[0]] = link.make(name[0], cid, false, size)
    delete this.links[nextName]
    return this
  }

  async get(name: string): Promise<CID | null> {
    const nextName = this.nextTree(name)
    if(nextName === null) return null

    const nextCID = this.links[nextName].cid
    if(nextName.length > 1) {
      return nextCID
    }
    const nextTree = await MMPT.fromCID(nextCID)
    return nextTree.get(name.slice(1))
  }

  async exists(name: string): Promise<boolean> {
    return (await this.get(name)) !== null
  }

  private nextTree(name: string): string | null {
    if(this.links[name[0]]) {
      return name[0]
    }else if(this.links[name]) {
      return name
    }
    return null
  }

  private nextTreeOrSibling(name: string): string | null {
    const nibble = name[0]
    if(this.links[nibble]) {
      return nibble
    }
    return Object.keys(this.links).find(child => nibble === child[0]) || null
  }
}
