import localforage from 'localforage'


const FS_CID_LOG = "fission_sdk.fs_cid_log"


export async function add(cid: string): Promise<void> {
  const log = await get()
  await localforage.setItem(FS_CID_LOG, [ cid, ...log ])
}

export async function get(): Promise<Array<string>> {
  return (await localforage.getItem(FS_CID_LOG)) || []
}

export async function index(cid: string): Promise<[number, number]> {
  const log = await get()
  return [ log.indexOf(cid), log.length ]
}

export async function newest(): Promise<string> {
  return (await get())[0]
}

export async function override(cid: string): Promise<void> {
  await localforage.setItem(FS_CID_LOG, [ cid ])
}

export async function removeOlderCids(idx: number): Promise<void> {
  const log = await get()
  await localforage.setItem(FS_CID_LOG, log.slice(0, idx + 1))
}
