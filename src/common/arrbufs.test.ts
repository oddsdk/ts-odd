import * as fc from 'fast-check'
import { equal } from './arrbufs'

test('arrbufs equal', () => {
  fc.assert(
    fc.property(fc.uint8Array(), data => {
      expect(equal(data.buffer, data.buffer)).toBe(true)
    })
  )
})

test('arrbufs not equal', () => {
  fc.assert(
    fc.property(
      fc.tuple(
        fc.uint8Array({ minLength: 3 }),
        fc.uint8Array({ minLength: 3 })
      ), data => {
        expect(equal(data[0].buffer, data[1].buffer)).toBe(false)
      })
  )
})