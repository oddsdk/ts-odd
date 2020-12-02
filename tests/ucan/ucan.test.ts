import path from 'path'

describe('UCAN', () => {
    it('can build a UCAN', async () => {
        const htmlPath = path.join(__dirname, 'index.html')
        await page.goto(`file://${htmlPath}`);

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
