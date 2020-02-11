import { test } from '../src/index'

describe('package', () => {
  it('works if true is truthy', () => {
    expect(true).toBeTruthy()
  })

  it('has test variable', () => {
    expect(test).toBeTruthy()
  })
})
