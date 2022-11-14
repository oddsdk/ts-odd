// declare module "mocha" {
//   export interface Context {}
// }

export const mochaHooks = {}

function errorContext(functionName: string) {
  return `Called "${functionName}" without a mocha test context. Make sure to run your tests as "it(..., async function(){}" and to provide "this": "${functionName}(this)"`
}