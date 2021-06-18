import * as storage from '../storage'
import { setup } from '../setup/internal'


const FS_CID_LOG_PREFIX = "webnative.wnfs_cid_log"


function key() {
  return FS_CID_LOG_PREFIX + "-" + setup.endpoints.lobby
}


// QUERYING


export async function get(): Promise<Array<string>> {
  return (await storage.getItem(key())) || []
}

export async function index(cid: string): Promise<[number, number]> {
  const log = await get()
  return [ log.indexOf(cid), log.length ]
}

export async function newest(): Promise<string> {
  return (await get())[0]
}



// MUTATION


export async function add(cid: string): Promise<void> {
  const log = await get()
  const newLog = [ cid, ...log ].slice(0, 1000)
  await storage.setItem(key(), newLog)
}


export async function clear(): Promise<void> {
  await storage.removeItem(key())
}
