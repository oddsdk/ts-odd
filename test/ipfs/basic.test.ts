import cbor from 'borc'
import basic from '../../src/ipfs/basic'
import encoded from '../../src/ipfs/encoded'
import { 
  cid1, cid2, unixfile1, unixfile2, buf1, buf2,
  filecontent, domainname, dnsContent,
  dagNode, dagLink1, dagLink2
} from './mock'
import { ipfsTest, encodedTest } from './util'

const sinon = require('sinon')

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
    name: 'catBuf',
    ipfsMethod: 'cat',
    req: async () => await basic.catBuf(cid1),
    expectedParams: [cid1],
    expectedResp: Buffer.concat([buf1, buf2])
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
    name: 'dagPutLinks',
    ipfsMethod: 'dag.put',
    req: async () => await basic.dagPutLinks([dagLink1, dagLink2]),
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

  encodedTest({
    name: 'encoded add',
    ipfsMethod: 'add',
    req: async (key?: string) => await encoded.add(filecontent, key),
    expectedParams: [cbor.encode(filecontent)],
    expectedResp: cid2,
    ksMethod: 'encrypt',
    expectedKsResp: null,
    expectedKsParams: [],
  })

})
