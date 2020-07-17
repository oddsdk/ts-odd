import loadScript from 'load-script2'

import setup from '../setup/internal'
import { IPFS } from './types'


type IpfsWindow = {
  Ipfs?: { create: (options: any) => IPFS }
}


const JS_IPFS = 'https://cdnjs.cloudflare.com/ajax/libs/ipfs/0.48.0/index.min.js'
const PEER_WSS = '/dns4/node.fission.systems/tcp/4003/wss/ipfs/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw'


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
