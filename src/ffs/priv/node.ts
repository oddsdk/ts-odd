import { emptyDir, encryptNode, decryptNode, decrypt, encrypt, contentToBytes } from './helpers'
import file from '../file'
import { PrivateNodeData, Link, Node } from '../types'
import { CID, FileContent } from '../../ipfs'

export class PrivateNode implements Node {

  links: Link[]
  key: string

  constructor(links: Link[], key: string) {
    this.links = links
    this.key = key
  }

  async put(keyStr: string): Promise<CID> {
    const encrypted = await encryptNode(this.data(), keyStr)
    return file.add(encrypted)
  }

  async updateChild(child: PrivateNode, name: string): Promise<PrivateNode> {
    const cid = await child.put(this.key)
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
    return empty()
  }
  
  async resolveContent(): Promise<FileContent | null> {
    const link = this.findLink('index')
    if(link === null) {
      return null
    }
    const content = await file.catBuf(link.cid)
    return decrypt(content, this.key)
  }

  data(): PrivateNodeData {
    return {
      key: this.key,
      links: this.links
    }
  }

  isFile(): boolean {
    return this.findLink('index') !== null
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
  return new PrivateNode(links, key)
}

export async function resolve(cid: CID, keyStr: string): Promise<PrivateNode> {
  const content = await file.catBuf(cid)
  const { key, links } = await decryptNode(content, keyStr)
  return new PrivateNode(links, key)
}

export async function fromContent(content: FileContent): Promise<PrivateNode> {
  const dir = await empty()
  const bytes = contentToBytes(content)
  const encrypted = encrypt(bytes, dir.key)
  const cid = await file.add(encrypted)
  const link = { name: 'index', cid }
  return dir.addLink(link)
}

export default {
  PrivateNode,
  empty,
  resolve,
  fromContent
}
