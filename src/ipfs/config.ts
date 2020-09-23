import loadScript from 'load-script2'

import { IPFS } from './types'
import { setup } from '../setup/internal'


type IpfsWindow = {
  Ipfs?: { create: (options: unknown) => IPFS }
}


export const JS_IPFS = 'https://cdnjs.cloudflare.com/ajax/libs/ipfs/0.50.0/index.min.js'
export const PEER_WSS = '/dns4/node.fission.systems/tcp/4003/wss/p2p/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw'
export const SIGNALING_SERVER = '/dns4/webrtc.runfission.com/tcp/443/wss/p2p-webrtc-star/'
export const DELEGATE_ADDR = '/dns4/ipfs.runfission.com/tcp/443/https'


let ipfs: IPFS | null = null


export const defaultOptions = {
  config: {
    Addresses: {
      Delegates: [ DELEGATE_ADDR ],
      Swarm: [ SIGNALING_SERVER ]
    },
   Bootstrap: [ PEER_WSS ]
  }
}

export const set = (userIpfs: unknown): void => {
  ipfs = userIpfs as IPFS
}

export const get = async (): Promise<IPFS> => {
  if (!ipfs) {
    await loadScript(JS_IPFS)

    const Ipfs = await (window as IpfsWindow).Ipfs
    if (!Ipfs) throw new Error(`Unable to load js-ipfs using the url: \`${JS_IPFS}\``)

    ipfs = await Ipfs.create({
      ...defaultOptions,
      ...setup.ipfs
    })
  }

  await ipfs.swarm.connect(PEER_WSS)

  return ipfs
}
