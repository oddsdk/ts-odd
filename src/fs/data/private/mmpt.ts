import CID from "cids"
import { linksFromCID, linksToCID, mapRecord, mapRecordSync } from "../links.js"
import { LazyCIDRef, lazyRefFromCID, lazyRefFromObj, OperationContext } from "../ref.js"


/**
 * Modified Merkle Patricia Tree (MMPT).
 * The tree has a branching factor of 16.
 * It stores items with hexidecimal keys and creates a new layer
 * when a given layer has two keys that start with the same nibble.
 */
export interface MMPT {
  // TODO: CID is eventually becoming something else like PrivateNode or sth
  [key: string]: CID | LazyCIDRef<MMPT>
}



type Nibble = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "a" | "b" | "c" | "d" | "e" | "f"

const nibbles = {
  "0": true, "1": true, "2": true, "3": true, "4": true, "5": true, "6": true, "7": true,
  "8": true, "9": true, "a": true, "b": true, "c": true, "d": true, "e": true, "f": true,
}

function isNibble(str: string): str is Nibble {
  return str in nibbles
}



export function empty(): MMPT {
  return {}
}

export async function add(mmpt: MMPT, name: string, entry: CID, ctx: OperationContext): Promise<MMPT> {
  const nibble = name[0]
  
  if (!isNibble(nibble)) throw new Error("Invalid name. Must be hexadecimal.")
  
  const childEntry = Object.entries(mmpt).find(([name]) => name[0] === nibble)

  if (childEntry == null) {
    // There's nothing with the same nibble, so we just return
    return {
      ...mmpt,
      [name]: entry
    }
  }

  const [childName, child] = childEntry
  const nameRest = name.slice(1)

  if (isNibble(childName)) {
    // There already exists a child MMPT because the name had to be split before
    if (CID.isCID(child)) throw new Error("Invalid MMPT structure.")
    return {
      ...mmpt,
      [childName]: lazyRefFromObj(await add(await child.get(ctx), nameRest, entry, ctx), mmptToCID)
    }
  }

  // There's another child with the same prefix as this name:
  // We need to split the colliding names into a new MMPT node
  const childNameRest = childName.slice(1)
  const childMMPT = await add({
    [childNameRest]: child
  }, nameRest, entry, ctx)
  const reducedMMPT = { ...mmpt }
  delete reducedMMPT[childName]
  return {
    ...reducedMMPT,
    [nibble]: lazyRefFromObj(childMMPT, mmptToCID)
  }
}

// TODO V2: export async function merge(mmptLeft: MMPT, mmptRight: MMPT)

export async function mmptToCID(mmpt: MMPT, ctx: OperationContext): Promise<CID> {
  return await linksToCID(
    await mapRecord(
      mmpt,
      async (_, child) => CID.isCID(child) ? child : await child.ref(ctx)),
    ctx
  )
}

export async function mmptFromCID(cid: CID, ctx: OperationContext): Promise<MMPT> {
  return mapRecordSync(
    await linksFromCID(cid, ctx),
    (key, cid) => isNibble(key) ? lazyRefFromCID(cid, mmptFromCID) : cid
  )
}

