import { loadWebnativePage } from '../helpers/page'


describe('UCAN', () => {
  it('can build a UCAN', async () => {
    await loadWebnativePage()

    const isValid = await page.evaluate(async () => {
      const ucan = await webnative.ucan.build({
        audience: await randomRsaDid(),
        issuer: await webnative.did.ucan()
      })

      return webnative.ucan.isValid(ucan)
    })

    expect(isValid).toBe(true)
  })
});
