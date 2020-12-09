/**
 * @jest-environment jsdom
 */
import * as base64 from './base64'

test('can decode an encoded string', () => {
  const testString = 'ab/c-d=='
  const encoded = base64.urlEncode(testString)
  expect(base64.urlDecode(encoded)).toEqual(testString)
})
