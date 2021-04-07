import * as fc from 'fast-check';
import { race } from './async'

test('race returns a promise that was passed into it', () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.integer()), async data => {
        const asyncFuncs = data.map(async num => {
          return async () => num
        })

        const fastestFunc = await race(asyncFuncs)
        const result = await fastestFunc()
        expect(data.includes(result)).toBe(true)
      })
  )
})