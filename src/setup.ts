import internalSetup from './setup/internal'


export function ipfs(s: { [key: string]: unknown }): void {
  internalSetup.ipfs = s
}
