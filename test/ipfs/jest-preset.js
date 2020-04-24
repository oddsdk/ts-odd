const tsPreset = require('ts-jest/jest-preset') // eslint-disable-line
const puppeteerPreset = require('jest-puppeteer/jest-preset') // eslint-disable-line
  
  
module.exports = Object.assign( // eslint-disable-line
  tsPreset, 
  puppeteerPreset
)

