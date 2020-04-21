import config from '../../src/ipfs/config'
import keystore from '../../src/keystore'

import { FakeIpfs, MethodCallDetails, dagLink2 } from './mock'

const sinon = require('sinon')

type IpfsTestOpts = {
  name: string
  ipfsMethod: string
  req: () => Promise<unknown>
  expectedResp: unknown
  expectedParams: unknown[]
}

type EncodedIpfsTestOpts = IpfsTestOpts & {
  req: (key?: string) => Promise<unknown>
  ksMethod: string
  expectedKsResp: unknown
  expectedKsParams: unknown[]
}


export const ipfsTest = (opts: IpfsTestOpts) => {
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
      expect(fakeIpfs.calls[opts.ipfsMethod].count).toEqual(1)
    })

    it(`should pass the correct parameters to ${opts.ipfsMethod}`, () => {
      expect(fakeIpfs.calls[opts.ipfsMethod].params).toEqual(opts.expectedParams)
    })

    it('returns the expected response', () => {
      expect(resp).toEqual(opts.expectedResp)
    })

  })
}

export const encodedTest = (opts: EncodedIpfsTestOpts) => {
  return describe(opts.name, () => {

    let fakeGetIpfs: any
    let fakeIpfs: FakeIpfs
    let fakeKsMethod: any
    let respWithKey: any

    beforeEach(() => {
      fakeIpfs = new FakeIpfs()
      fakeGetIpfs = sinon.fake.returns(fakeIpfs)
      sinon.stub(config, 'getIpfs').callsFake(fakeGetIpfs)

      fakeKsMethod = sinon.fake.returns(new Uint8Array([1, 2, 3, 4]))
      sinon.stub(keystore, 'encrypt').callsFake(fakeKsMethod)

    })

    describe('without key', () => {
      let resp: any

      beforeAll(async () => {
        resp = await opts.req()
      })

      it(`should call ${opts.ipfsMethod} once`, () => {
        expect(fakeIpfs.calls[opts.ipfsMethod].count).toEqual(1)
      })

      it(`should pass the correct parameters to ${opts.ipfsMethod}`, () => {
        expect(fakeIpfs.calls[opts.ipfsMethod].params).toEqual(opts.expectedParams)
      })

      it('returns the expected response', () => {
        expect(resp).toEqual(opts.expectedResp)
      })

      it('returns the expected response', () => {
        expect(resp).toEqual(opts.expectedResp)
      })
    })

    describe('with key', () => {
      it('should be true', () => {
        expect(true).toBeTruthy()
      })

    })

    // beforeAll(async () => {
    //     })
  })
}

const checkExpectedResp = (resp: unknown, expectedResp: unknown) => {
}


