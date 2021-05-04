// Took this one-liner from: https://www.npmjs.com/package/browser-or-node
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined'

export const assertBrowser = (method: string): void => {
  if(!isBrowser) {
    throw new Error(`Must be in browser to use method. Provide a node-compatible implementation for ${method}`)
  }
}
