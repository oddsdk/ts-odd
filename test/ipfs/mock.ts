import util from '../../src/ipfs/util'
import { DAG_NODE_DATA } from '../../src/ipfs/constants'

export const cid1 = "QmNxagjgbocSmYWTHXmFx7b29pQQw8u6rhe471FVyKRoAv"
export const cid2 = "QmWKst5WVNTPfMsSFCQEJYBJLEsUZfghqrKXJBVU4EuA76"
export const unixfile1 = { cid: cid1 }
export const unixfile2 = { cid: cid2 }
export const buf1 = Buffer.from('hello')
export const buf2 = Buffer.from('world')
export const filecontent = 'file content'
export const domainname = 'fake.fission.name'
export const dnsContent = `/ipfs/${cid1}`

export const rawDAGLink1 = { _name: 'one', _cid: cid1, _size: 8 }
export const rawDAGLink2 = { _name: 'two', _cid: cid2, _size: 12 }
export const rawDAGNode = { 
  remainderPath: '', 
  value: {
    _data: DAG_NODE_DATA,
    _links: [rawDAGLink1, rawDAGLink2],
    _size: 20,
  }
}
export const dagLink1 = util.rawToDAGLink(rawDAGLink1 as any)
export const dagLink2 = util.rawToDAGLink(rawDAGLink2 as any)
export const dagNode = util.rawToDAGNode(rawDAGNode as any)

export type MethodCallDetails = {
  params: any[]
  count: number
}

const empty = () => ({
  params: [],
  count: 0
})

export class FakeIpfs {
  calls = {
    add: empty(),
    cat: empty(),
    ls: empty(),
    dns: empty(),
    ['dag.get']: empty(),
    ['dag.put']: empty(),
  } as { [method: string]: MethodCallDetails }

  trackCall(method: string, args: any) {
    this.calls[method].params = args
    this.calls[method].count += 1
  }

  async * add (...args: any[]) {
    this.trackCall('add', args)
    yield unixfile1
    yield unixfile2
  }

  async * cat (...args: any[]) {
    this.trackCall('cat', args)
    yield buf1
    yield buf2
  }

  async * ls (...args: any[]) {
    this.trackCall('ls', args)
    yield unixfile1
    yield unixfile2
  }

  async dns(...args: any[]) {
    this.trackCall('dns', args)
    return dnsContent
  }

  dag = {
    get: async (...args: any[]) => {
      this.trackCall('dag.get', args)
      return rawDAGNode
    },
    put: async (...args: any[]) => {
      this.trackCall('dag.put', args)
      return cid1
    }
  }
}


