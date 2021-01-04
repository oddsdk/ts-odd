import path from 'path'


export function loadWebnativePage(): Promise<void> {
  const htmlPath = path.join(__dirname, '../fixtures/index.html')
  return page.goto(`file://${htmlPath}`)
}
