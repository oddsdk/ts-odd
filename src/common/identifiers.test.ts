import { bareNameFilter, readKey } from './identifiers.js'

test('bare name filter starts with wnfs__bareNameFilter__', async () => {
  const result = await bareNameFilter({ path: {file: ['public', 'test']} })
  expect(result).toMatch(/^wnfs__bareNameFilter__/)
}) 

test('read key starts with wnfs__readKey__', async () => {
  const result = await readKey({ path: {file: ['private', 'test']} })
  expect(result).toMatch(/^wnfs__readKey__/)
}) 