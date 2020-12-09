import * as dns from '../dns'
import { did } from './api'

jest.mock('../dns')

const TEST_DID = 'did:key:test-key'

describe('api', () => {
  it('can get fission did', async () => {
    dns.lookupTxtRecord.mockResolvedValue(TEST_DID)
    const serverDID = await did()
    expect(serverDID).toEqual(TEST_DID)
  })

  it('will use cached value', async () => {
    dns.lookupTxtRecord.mockResolvedValue(TEST_DID)
    const firstDID = await did()
    expect(firstDID).toEqual(TEST_DID)
    dns.lookupTxtRecord.mockResolvedValue('did:key:another-key')
    const secondDID = await did()
    expect(secondDID).toEqual(firstDID)
  })

  it('throws an error if DID not found', async () => {
    dns.lookupTxtRecord.mockResolvedValue(null)
    try {
      await did()
    } catch (e) {
      expect(e).toMatch('DID')
    }
  })
})
