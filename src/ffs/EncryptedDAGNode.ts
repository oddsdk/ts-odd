import { CID } from '../ipfs'

type Link = {
  name: string
  cid: CID
  size?: number
}

class EncryptedDAGNode {

  links: Link[]
  key: string

  constructor(links: Link[], key: string) {
    this.links = links
    this.key = key
  }

  encrypt(key: string) {

  }

}

export default EncryptedDAGNode
