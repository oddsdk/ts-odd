import path from 'path'


export async function loadWebnativePage(): Promise<void> {
  const htmlPath = path.join(__dirname, '../fixtures/index.html')
  console.log(__dirname, htmlPath)
  await page.goto(`file://${htmlPath}`)
}
