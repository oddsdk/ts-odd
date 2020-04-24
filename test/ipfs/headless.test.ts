import "expect-puppeteer"

describe('window.btoa', () => {

  let resp: string
 
  beforeAll(async () => {
    resp = await page.evaluate(() => {
      return window.btoa('abcd')
    })
  })

  it('should properly decode base64', async () => {
    expect(resp).toEqual("YWJjZA==")
  })

})
