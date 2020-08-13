import { setup } from '../setup/internal'


export function log(...args: unknown[]) {
  if (setup.debug) console.log(...args)
}
