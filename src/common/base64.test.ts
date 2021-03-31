/**
 * @jest-environment jsdom
 */
import * as fc from 'fast-check';
import * as base64 from './base64'

test('round trip encode and decode a url', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 4000 }), data => {
      const encodedData = base64.urlEncode(data)
      const decodedData = base64.urlDecode(encodedData)
      expect(data).toEqual(decodedData)
    })
  );
})