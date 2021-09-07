import * as ratchet from "./spiralratchet.js"

/*

map from bareName -> ratchet cache (?)

ratchet cache
- stores "original" ratchet, i.e. oldest known ratchet
- supports "insert" for another ratchet. Figures out where it belongs
  in relation to what exists (using "ratchet.compare"?). Can figure out
  if it's just not part of the same strip, e.g. when there was a key rotation
- supports "seek to newest" which will also populate the cache at the same time.
  Used for just... getting the most recent version of a private node.
- supports "get X versions back from this one"
- supports "what version is this in relation to the earliest we know?"

*/

export class RatchetStrip {

  readonly oldestRatchet: ratchet.SpiralRatchet
  readonly keyCache: Map<number, Uint8Array>
  readonly laterRatchets: Map<number, ratchet.SpiralRatchet>
  latestRevision: number

  constructor(
    oldestRatchet: ratchet.SpiralRatchet,
    keyCache: Map<number, Uint8Array>,
    laterRatchets: Map<number, ratchet.SpiralRatchet>
  ) {
    this.oldestRatchet = oldestRatchet
    this.keyCache = keyCache
    this.laterRatchets = laterRatchets
    this.latestRevision = Array.from(laterRatchets.keys()).reduce((a, b) => Math.max(a, b), 0)
  }


  static fromOriginalRatchet(original: ratchet.SpiralRatchet): RatchetStrip {
    return new RatchetStrip(original, new Map(), new Map())
  }


  async insert(spiral: ratchet.SpiralRatchet): Promise<number> {
    const latest = this.latest()
    // 100 max steps = 100*256*256 ~= 6.5M max changes since the latest read
    // if exhausted to this limit (should only happen after 6.5M unseen changes)
    // this will take about ~5ms
    const stepsAhead = await ratchet.compare(spiral, latest.ratchet, 100)

    // invalidate when latest changed concurrently
    if (this.latest() != latest) {
      return await this.insert(spiral)
    }

    if (stepsAhead === "unknown") {
      throw new Error(`Couldn't insert observed ratchet into RatchetStrip. Its relative position is unknown.`)
    }

    const spiralLocalRevision = latest.localRevision + stepsAhead
    this.insertAt(spiralLocalRevision, spiral)
    return spiralLocalRevision
  }


  private insertAt(localRevision: number, spiral: ratchet.SpiralRatchet): void {
    if (localRevision < 0) {
      console.warn(`Observed earlier ratchet than original ratchet obvserved (revision ${localRevision}). This is weird.`)
    }
    this.latestRevision = Math.max(this.latestRevision, localRevision)
    this.laterRatchets.set(localRevision, spiral)
  }


  async seek<T>(get: (ratchet: ratchet.SpiralRatchet) => Promise<T | null>): Promise<T> {
    const latest = this.latest()

    const first = await get(latest.ratchet)
    if (first == null) {
      throw new Error(`RatchetStrip.seek: Couldn't successfully get data behind the latest ratchet (revision: ${latest.localRevision}).`)
    }

    let latestActualValue: T = first

    await ratchet.seek(latest.ratchet, async seek => {
      this.insertAt(latest.localRevision + seek.increasedBy, seek.ratchet)

      const value = await get(seek.ratchet)
      if (value != null) {
        latestActualValue = value
        return true
      }
      return false
    })

    return latestActualValue
  }


  latest(): { ratchet: ratchet.SpiralRatchet; localRevision: number } {
    const later = this.laterRatchets.get(this.latestRevision)
    if (later != null) {
      return { ratchet: later, localRevision: this.latestRevision }
    }
    return { ratchet: this.oldestRatchet, localRevision: 0 }
  }

}