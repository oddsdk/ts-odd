const Buffer = require('buffer/').Buffer
import basic from '../src/ipfs/basic'
import config from '../src/ipfs/config'
import util from '../src/ipfs/util'
import { DAG_NODE_DATA } from '../src/ipfs/constants'
import { FileContent, CID, RawDAGNode } from '../src/ipfs/types'

const sinon = require('sinon')


const cid1 = "QmNxagjgbocSmYWTHXmFx7b29pQQw8u6rhe471FVyKRoAv"
const cid2 = "QmWKst5WVNTPfMsSFCQEJYBJLEsUZfghqrKXJBVU4EuA76"
const unixfile1 = { cid: cid1 }
const unixfile2 = { cid: cid2 }
const buf1 = Buffer.from('hello')
const buf2 = Buffer.from('world')
const filecontent = 'file content'
const domainname = 'fake.fission.name'
const dnsContent = `/ipfs/${cid1}`

const rawDAGLink1 = { _name: 'one', _cid: cid1, _size: 8 }
const rawDAGLink2 = { _name: 'two', _cid: cid2, _size: 12 }
const rawDAGNode = { 
  remainderPath: '', 
  value: {
    _data: DAG_NODE_DATA,
    _links: [rawDAGLink1, rawDAGLink2],
    _size: 20,
  }
}
const dagNode = util.rawToDAGNode(rawDAGNode as unknown as RawDAGNode)

type MethodCallDetails = {
  params: any[]
  count: number
}

const empty = () => ({
  params: [],
  count: 0
})

class FakeIpfs {
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

type IpfsTestOpts = {
  name: string
  ipfsMethod: string
  req: () => Promise<any>
  expectedResp: any
  expectedParams: any[]
}

const ipfsTest = (opts: IpfsTestOpts) => {
  return describe(opts.name, () => {

    let fakeGetIpfs: any
    let fakeIpfs: FakeIpfs
    let resp: any

    beforeAll(async () => {
      fakeIpfs = new FakeIpfs()
      fakeGetIpfs = sinon.fake.returns(fakeIpfs)
      sinon.stub(config, 'getIpfs').callsFake(fakeGetIpfs)
      resp = await opts.req()
    })

    it(`should call ${opts.ipfsMethod} once`, () => {
      expect(fakeIpfs.calls[opts.ipfsMethod]?.count).toEqual(1)
    })

    it('should pass the correct parameters to add', () => {
      expect(fakeIpfs.calls[opts.ipfsMethod]?.params).toEqual(opts.expectedParams)
    })

    it('returns the expected response', () => {
      expect(resp).toEqual(opts.expectedResp)
    })
  })
}

describe('ipfs', () => {

  beforeEach(() => sinon.restore())

  ipfsTest({
    name: 'add',
    ipfsMethod: 'add',
    req: async () => await basic.add(filecontent),
    expectedParams: [filecontent],
    expectedResp:  cid2
  })

  ipfsTest({
    name: 'catRaw',
    ipfsMethod: 'cat',
    req: async () => await basic.catRaw(cid1),
    expectedParams: [cid1],
    expectedResp: [buf1, buf2]
  })

  ipfsTest({
    name: 'ls',
    ipfsMethod: 'ls',
    req: async () => await basic.ls(cid1),
    expectedParams: [cid1],
    expectedResp: [unixfile1, unixfile2]
  })

  ipfsTest({
    name: 'dagGet',
    ipfsMethod: 'dag.get',
    req: async () => await basic.dagGet(cid1),
    expectedParams: [cid1],
    expectedResp: dagNode
  })

  ipfsTest({
    name: 'dagPut',
    ipfsMethod: 'dag.put',
    req: async () => await basic.dagPut(dagNode),
    expectedParams: [dagNode, { format: "dag-pb", hashAlg: "sha2-256" }],
    expectedResp: cid1
  })

  ipfsTest({
    name: 'dns',
    ipfsMethod: 'dns',
    req: async () => await basic.dns(domainname),
    expectedParams: [domainname],
    expectedResp: dnsContent
  })
})
