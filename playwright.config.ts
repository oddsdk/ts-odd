import { PlaywrightTestConfig } from "@playwright/test"

const config: PlaywrightTestConfig = {
  // Run *.browser.test.ts files
  testMatch: [
    "src/**/*.browser.test.ts",
    "tests/**/*.browser.test.ts",
  ],

  // Each test is given 30 seconds
  timeout: 30000,

  // Forbid test.only on CI
  //   forbidOnly: !!process.env.CI,

  // Two retries for each test
  //   retries: 2,

  // Limit the number of workers on CI, use default locally
  //   workers: process.env.CI ? 2 : undefined,

  use: {
    // Configure browser and context here
  },
}

export default config