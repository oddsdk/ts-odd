import config from '../../src/ipfs/config'
import keystore from '../../src/keystore'

import { FakeIpfs, MethodCallDetails, dagLink2 } from './mock'

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

    let fakeGetIpfs: jest.SpyInstance
    let fakeIpfs: FakeIpfs
    let resp: any

    beforeAll(async () => {
      fakeIpfs = new FakeIpfs()
      fakeGetIpfs = jest.spyOn(config, 'getIpfs')
      fakeGetIpfs.mockResolvedValue(fakeIpfs)

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

    let fakeGetIpfs: jest.SpyInstance
    let fakeIpfs: FakeIpfs
    let fakeKsMethod: jest.SpyInstance
    let respWithKey: any

    beforeEach(() => {
      fakeIpfs = new FakeIpfs()
      fakeGetIpfs = jest.spyOn(config, 'getIpfs')
      fakeGetIpfs.mockResolvedValue(fakeIpfs)

      fakeKsMethod = jest.spyOn(keystore, 'encrypt')
      fakeKsMethod.mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
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


