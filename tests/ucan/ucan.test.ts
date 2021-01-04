import { loadWebnativePage } from '../helpers/page'


describe('UCAN', () => {
  it('can build a UCAN', async () => {
    await loadWebnativePage()

    const ucan = await page.evaluate(async () => {
      return webnative.ucan.build({
        audience: await randomRsaDid(),
        issuer: await webnative.did.ucan()
      })
    })

    // TODO: replace with `isValid`
    expect(ucan.length).toBeGreaterThan(100)
  })
});
