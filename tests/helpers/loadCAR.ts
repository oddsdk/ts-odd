import * as fs from "fs"
import { CarBlockIterator } from "@ipld/car"
import { CID } from "multiformats"
import { inMemoryDepot } from "./components.js"


/**
 * @returns the roots defined in the CAR file
 */
export async function loadCAR(filepath: string): Promise<{ roots: CID[] }> {
  const inStream = fs.createReadStream(filepath)
  const reader = await CarBlockIterator.fromIterable(inStream)

  try {
    const roots = await reader.getRoots()

    for await (const { cid, bytes } of reader) {
      inMemoryDepot[ cid.toString() ] = bytes
    }

    return { roots }
  } finally {
    inStream.close()
  }
}

export async function loadCARWithRoot(filepath: string): Promise<CID> {
  const { roots } = await loadCAR(filepath)
  const [ rootCID ] = roots

  if (rootCID == null) {
    throw new Error(`CAR file at ${filepath} doesn't have a root specified.`)
  }

  return rootCID
}
