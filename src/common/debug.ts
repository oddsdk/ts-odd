import { setup } from '../setup/internal.js'


export function log(...args: unknown[]): void {
  if (setup.debug) console.log(...args)
}
