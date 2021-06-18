import { setup } from '../setup/internal'


export function log(...args: unknown[]): void {
  if (setup.debug) console.log(...args)
}
