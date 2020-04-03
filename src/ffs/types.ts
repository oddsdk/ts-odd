import { FileContent, CID } from '../ipfs'

export type AddLinkOpts = {
  shouldOverwrite?: boolean
}

export type NonEmptyPath = [string, ...string[]]

export type PrivateTreeData = {
  key: string
  links: Links
}

export type Link = {
  name: string
  cid: CID
  size?: number 
  mtime?: number
  isFile: boolean
}

export type Links = { [name: string]: Link }

export interface FileStatic {
  create: (content: FileContent) => File
  fromCID: (cid: CID) => Promise<File>
}

export interface PrivateFileStatic extends FileStatic{
  fromCIDWithKey: (cid: CID, key: string) => Promise<File>
}

export interface File {
  content: FileContent
  put(): Promise<CID>
}

export interface TreeStatic {
  empty: () => Promise<Tree>
  fromCID: (cid: CID) => Promise<Tree>
}

export interface PrivateTreeStatic extends TreeStatic {
  fromCIDWithKey: (cid: CID, key: string) => Promise<Tree>
}

export interface Tree {
  links: Links
  isFile: boolean
  static: {
    tree: TreeStatic
    file: FileStatic
  }


  ls(path: string): Promise<Links>
  mkdir(path: string): Promise<Tree>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<Tree>
  get(path: string): Promise<Tree | File>
  pathExists(path: string): Promise<boolean> 
  addChild(path: string, toAdd: Tree | File): Promise<Tree>

  put(): Promise<CID>
  updateDirectChild(child: Tree | File, name: string): Promise<Tree>
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string): Promise<Tree | File>

  findLink(name: string): Link | null
  updateLink(link: Link): Tree
  rmLink(name: string): Tree
  copyWithLinks(links: Links): Tree
}
