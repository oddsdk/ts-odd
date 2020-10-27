import path from "path"
import puppeteer from "puppeteer"


const URL = "http://localhost:9000"


export default async (t, run) => {
	const browser = await puppeteer.launch()
	const page = await browser.newPage()
	try {
		const htmlPath = path.join(process.cwd(), "tests", "index.html")
	  await page.goto(`file://${htmlPath}`)
		await run(t, page)
	} finally {
		await page.close()
		await browser.close()
	}
}
