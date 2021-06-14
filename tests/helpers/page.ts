import path from 'path'


export async function loadWebnativePage(): Promise<void> {
  const htmlPath = path.join(__dirname, '../fixtures/index.html')
  await page.goto(`file://${htmlPath}`)
}
