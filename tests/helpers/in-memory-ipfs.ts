import Ipfs, { IPFS } from 'ipfs-core'
import Repo from 'ipfs-repo'
import { MemoryDatastore } from 'interface-datastore'

export async function createInMemoryIPFS(): Promise<IPFS> {
  return await Ipfs.create({
    offline: true,
    silent: true,
    preload: {
      enabled: false,
    },
    config: {
      Addresses: {
        Swarm: []
      },
    },
    repo: new Repo('inmem', {
      lock: {
        lock: async () => ({ close: async () => { return } }),
        locked: async () => false
      },
      autoMigrate: false,
      storageBackends: {
        root: MemoryDatastore,
        blocks: MemoryDatastore,
        keys: MemoryDatastore,
        datastore: MemoryDatastore,
        pins: MemoryDatastore,
      },
    })
  })
}
