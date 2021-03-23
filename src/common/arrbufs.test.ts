import { equal } from './arrbufs'

describe('arrbufs equal', () => {
  it('returns true on identical buffers', () => {
    const buffA = new ArrayBuffer(8)
    const buffB = new ArrayBuffer(8)
    expect(equal(buffA, buffB)).toBe(true)
  })

  it('returns false on different buffers', () => {
    const buffA = new Uint8Array([0xed, 0x01])
    const buffB = new Uint8Array([0xed, 0x02])
    expect(equal(buffA, buffB)).toBe(false)
  })

  it('returns false on buffers with different lengths', () => {
    const buffA = new Uint8Array([0x01, 0x02])
    const buffB = new Uint8Array([0x01, 0x02, 0x03])
    expect(equal(buffA, buffB)).toBe(false)
  })
})
