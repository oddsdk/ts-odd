import CID from "cids"
import { CborForm } from "./common.js"

type Encoding = "utf8" | "json" | "cbor" | "raw" | "cid"

interface EncodingOptions {
  encoding: Encoding
}

type EncodingType<E extends Encoding>
  = E extends "utf8" ? string
  : E extends "raw" ? Uint8Array
  : E extends "cid" ? CID
  : E extends "cbor" ? CborForm
  : unknown

export interface ReadableDirectory {
  read(path: [string, ...string[]], options: EncodingOptions): Promise<EncodingType<typeof options.encoding>>
  exists(path: [string, ...string[]]): Promise<boolean>
  ls(path: [string, ...string[]]): Promise<null | string[]>
  historyFor(path: [string, ...string[]]): AsyncIterator<ReadableDirectory | ReadableFile>
}

export interface WritableDirectory extends ReadableDirectory {
  write(path: [string, ...string[]], content: EncodingType<typeof options.encoding>, options: EncodingOptions): Promise<void>
  mkdir(path: [string, ...string[]]): Promise<void>
  // cp
}

export interface ReadableFile {
  read(options: EncodingOptions): Promise<EncodingType<typeof options.encoding>>
}

export interface WriteableFile extends ReadableFile {
  write(content: EncodingType<typeof options.encoding>, options: EncodingOptions): Promise<void>
}



interface FileSystem {
  public: CID
  private: CID
}

/*
class Transaction {

  // we also need to store BlockStores for the public FS and
  public: WritableDirectory
  // a PrivateBlockStore for every private filesystme entry, but connected to a 
  // top-level PrivateBlockStore that knows about the IAMap, which should be lazily loaded.
  private: { [name: string]: ReadableFile | WriteableFile | ReadableDirectory | WritableDirectory }

  finalize(): FileSystem {
    const publicCID = await this.public.finalize()
    let privateBlocks = await load(filesystem.private)
    for (const fs of Object.values(this.private)) {
      privateBlocks = await fs.finalize(privateBlocks)
    }
    const privateCID = await store(privateBlocks)
    return {
      public: publicCID,
      private: privateCID
    }
  }
}

// What's the finalize thing?
Eventually we want to generate one root cid we can send to others.

But in the meantime someone else might've sent us another CID. What do we do then?

I think the right thing might be a combination of reconciliation with detecting conflicts + retrying.

I guess it all comes down to the "SyncManager" in the end. I feel like I don't quite know what
interface it's going to have. This is what's causing the headache for me.

Why is it so easy for go-wnfs? I think it's because it's just DiskFileSystem -> WNFS -> CID

I could go this way as well, and just try to generate a CID finally.

I assume this is at least part of the interface to the SyncManager.


Ok, the other part is probably the sync manager telling us the current "CID" of the filesystem state.

So it's basically SyncManager#submit(cidBefore: CID, cidAfter: CID): boolean. Or something like that.

There's questions in here like, who's going to be responsible for doing reconiliation? On the one hand
this kind of interface makes the caller responsible for being up to date (cidBefore), so having to do
reconciliation is on them. But on the other hand, the sync manager might have to do reconciliation itself,
because there's just outside events that cause the sync manager to do stuff.

I feel like the "retry" semantics for transactions should definietly be challenged. These kinds of
semantics don't work for distributed system cases. There we really do need merging. We can't retry
all of our work just because someone just told us about a change we didn't know about shortly after genesis.



*/