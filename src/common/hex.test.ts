import * as fc from 'fast-check';
import { fromBuffer, toBuffer } from './hex'

test('round trip to buffer and back out', () => {
  fc.assert(
    fc.property(fc.array(fc.integer(16, 255)), data => {
      const hexData = []
      const buffers = []
      const returnData = []

      for (const num of data) {
        hexData.push(num.toString(16))
      }

      for (const hex of hexData) {
        buffers.push(toBuffer(hex))
      }

      for (const buffer of buffers) {
        returnData.push(fromBuffer(buffer))
      }

      expect(returnData).toEqual(hexData)
    })
  );
});