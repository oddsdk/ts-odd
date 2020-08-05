import loadScript from 'load-script2'

import { IPFS } from './types'
import { setup } from '../setup/internal'


type IpfsWindow = {
  Ipfs?: { create: (options: unknown) => IPFS }
}


export const JS_IPFS = 'https://cdnjs.cloudflare.com/ajax/libs/ipfs/0.48.1/index.min.js'
export const PEER_WSS = '/dns4/node.fission.systems/tcp/4003/wss/ipfs/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw'


let ipfs: IPFS | null = null


export const defaultOptions = {
  config: {
    Bootstrap: [ PEER_WSS ]
  }
}

export const set = (userIpfs: unknown): void => {
  ipfs = userIpfs as IPFS
}

export const get = async (): Promise<IPFS> => {
  if (ipfs) return ipfs

  await loadScript(JS_IPFS)

  const Ipfs = await (window as IpfsWindow).Ipfs
  if (!Ipfs) throw new Error(`Unable to load js-ipfs using the url: \`${JS_IPFS}\``)

  ipfs = Ipfs.create({
    ...defaultOptions,
    ...setup.ipfs
  })

  return ipfs
}
