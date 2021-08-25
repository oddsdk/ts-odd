import { EncryptionContext } from "./context.js"

export interface SpiralRatchet {
  large: ArrayBuffer

  medium: ArrayBuffer
  mediumCounter: number

  small: ArrayBuffer
  smallCounter: number
}

export interface RatchetOptions {
  seed: ArrayBuffer
  ffSmall: number
  ffMedium: number
}


export async function toKey(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<ArrayBuffer> {
  return sha(ctx.webcrypto, xor(ratchet.large, xor(ratchet.medium, ratchet.small)))
}

export async function setup(options: EncryptionContext & Partial<RatchetOptions>): Promise<SpiralRatchet> {
  const { webcrypto, crypto, ffMedium, ffSmall } = options
  let [mediumSkip, smallSkip] = crypto.getRandomValues(new Uint8Array(2))
  mediumSkip = ffMedium == null ? mediumSkip : ffMedium
  smallSkip = ffSmall == null ? smallSkip : ffSmall

  const ratchet = await zero(options)

  return Object.freeze({
    ...ratchet,
    medium: await shaN(webcrypto, ratchet.medium, mediumSkip),
    mediumCounter: mediumSkip,
    small: await shaN(webcrypto, ratchet.small, smallSkip),
    smallCounter: smallSkip,
  })
}

async function zero({ webcrypto, crypto, seed }: EncryptionContext & { seed?: ArrayBuffer }): Promise<SpiralRatchet> {
  const largePre = seed || crypto.getRandomValues(new Uint8Array(32)).buffer
  const mediumPre = await sha(webcrypto, complement(largePre))
  const medium = await sha(webcrypto, mediumPre)
  const small = await sha(webcrypto, complement(mediumPre))

  return Object.freeze({
    large: await sha(webcrypto, largePre),
    medium,
    mediumCounter: 0,
    small,
    smallCounter: 0,
  })
}


export async function inc(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  if (ratchet.smallCounter >= 255) {
    return await nextMediumEpoch(ratchet, ctx)
  }

  return Object.freeze({
    ...ratchet,
    small: await sha(webcrypto, ratchet.small), // NOTE: this uses the input ratchet
    smallCounter: ratchet.smallCounter + 1,
  })
}

export async function incBy(ratchet: SpiralRatchet, n: number, ctx: EncryptionContext): Promise<SpiralRatchet> {
  if (n <= 0) return ratchet
  if (n >= 256 * 256 - combinedCounter(ratchet)) { // i.e. there *will* be a large epoch jump if we used `inc`s
    const jumped = await nextLargeEpoch(ratchet, ctx)
    const stepsDone = 256 * 256 - combinedCounter(ratchet) // steps to the next large epoch
    return await incBy(jumped, n - stepsDone, ctx)
  }
  if (n >= 256 - ratchet.smallCounter) { // i.e. there *will* be a medium epoch jump if we used `inc`s
    const jumped = await nextMediumEpoch(ratchet, ctx)
    const stepsDone = combinedCounter(jumped) - combinedCounter(ratchet)
    return await incBy(jumped, n - stepsDone, ctx)
  }
  return await incBySmall(ratchet, n, ctx)
}

export async function nextMediumEpoch(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  if (ratchet.mediumCounter >= 255) {
    return await nextLargeEpoch(ratchet, ctx)
  }

  return {
    ...ratchet,

    medium: await sha(webcrypto, ratchet.medium), // NOTE: this uses the input ratchet
    mediumCounter: ratchet.mediumCounter + 1,

    small: await sha(webcrypto, complement(ratchet.medium)), // NOTE: this uses the input ratchet
    smallCounter: 0
  }
}

export async function nextLargeEpoch(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  return await zero({ ...ctx, seed: ratchet.large })
}



//--------------------------------------
// Private ㊙️
//--------------------------------------


async function incBySmall(ratchet: SpiralRatchet, n: number, { webcrypto }: EncryptionContext): Promise<SpiralRatchet> {
  const small = await shaN(webcrypto, ratchet.small, n)
  return Object.freeze({
    ...ratchet,
    small,
    smallCounter: ratchet.smallCounter + n
  })
}

async function sha(webcrypto: SubtleCrypto, buffer: ArrayBuffer): Promise<ArrayBuffer> {
  return await webcrypto.digest("sha-256", buffer)
}

async function shaN(webcrypto: SubtleCrypto, buffer: ArrayBuffer, n: number): Promise<ArrayBuffer> {
  for (let i = 0; i < n; i++) {
    buffer = await webcrypto.digest("sha-256", buffer)
  }
  return buffer
}

function combinedCounter(ratchet: SpiralRatchet): number {
  return 256 * ratchet.mediumCounter + ratchet.smallCounter
}

function complement(array: ArrayBuffer): ArrayBuffer {
  return new Uint8Array(array).map(n => n ^ 0xFF).buffer
}

function xor(l: ArrayBuffer, r: ArrayBuffer): ArrayBuffer {
  if (l.byteLength != r.byteLength) throw new Error("Can't xor two array buffers with different lengths")
  const rBytes = new Uint8Array(r)
  return new Uint8Array(l).map((value, i) => value ^ rBytes[i])
}
