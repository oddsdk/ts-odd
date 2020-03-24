import { emptyDir, encryptNode, decryptNode } from './helpers'
import file from '../file'
import { PrivateNodeData, Link } from '../types'
import { CID } from '../../ipfs'

export class PrivateNode {

  key: string
  links: Link[]

  constructor(key: string, links: Link[]) {
    this.key = key
    this.links = links
  }

  async put(keyStr: string): Promise<CID> {
    const encrypted = await encryptNode(this.data(), keyStr)
    return file.add(encrypted)
  }

  async updateChild(toAdd: PrivateNode, name: string): Promise<PrivateNode> {
    const cid = await toAdd.put(this.key)
    const link = { name, cid }
    return this.replaceLink(link)
  }

  async resolveChild(name: string): Promise<PrivateNode | null> {
    const link = this.findLink(name)
    if(link === null){
      return null
    }
    return resolve(link.cid, this.key)
  }

  async resolveOrAddChild(name: string): Promise<PrivateNode> {
    const maybeChild = await this.resolveChild(name)
    if(maybeChild !== null){
      return maybeChild
    }
    return this.updateChild(await empty(), name)
  }

  data(): PrivateNodeData {
    return {
      key: this.key,
      links: this.links
    }
  }

  findLink(name: string): Link | null {
    return this.links?.find(l => l.name === name) || null
  }

  addLink(link: Link): PrivateNode {
    this.links.push(link)
    return this
  }

  rmLink(name: string): PrivateNode {
    this.links = this.links.filter(l => l.name !== name)
    return this
  }

  replaceLink(link: Link): PrivateNode {
    this.rmLink(link.name)
    this.addLink(link)
    return this
  }
}

export async function empty(): Promise<PrivateNode> {
  const { key, links } = await emptyDir()
  return new PrivateNode(key, links)
}

export async function resolve(cid: CID, keyStr: string): Promise<PrivateNode> {
  const content = await file.catBuf(cid)
  const { key, links } = await decryptNode(content, keyStr)
  return new PrivateNode(key, links)
}


export default {
  PrivateNode,
  empty,
  resolve
}
