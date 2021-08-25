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
    return await next256Epoch(ratchet, ctx)
  }

  return Object.freeze({
    ...ratchet,
    small: await sha(webcrypto, ratchet.small), // NOTE: this uses the input ratchet
    smallCounter: ratchet.smallCounter + 1,
  })
}

export async function next256Epoch(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  if (ratchet.mediumCounter >= 255) {
    return await next65536Epoch(ratchet, ctx)
  }

  return Object.freeze({
    ...ratchet,

    medium: await sha(webcrypto, ratchet.medium), // NOTE: this uses the input ratchet
    mediumCounter: ratchet.mediumCounter + 1,

    small: await sha(webcrypto, complement(ratchet.medium)), // NOTE: this uses the input ratchet
    smallCounter: 0
  })
}

export async function next65536Epoch(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  return await zero({ ...ctx, seed: ratchet.large })
}

export async function incBy(ratchet: SpiralRatchet, n: number, ctx: EncryptionContext): Promise<SpiralRatchet> {
  if (n <= 0) return ratchet
  if (n < 256 - ratchet.smallCounter) return await incBySmall(ratchet, n, ctx)
  if (n < 65536 - 256 * ratchet.mediumCounter) return await incByMedium(ratchet, n, ctx)
  return await incByLarge(ratchet, n, ctx)
}

async function incByLarge(ratchet: SpiralRatchet, n: number, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  const target = n + 256 * ratchet.mediumCounter + ratchet.smallCounter

  const largeSteps = Math.floor(target / 65536)
  const largePre = await shaN(webcrypto, ratchet.large, largeSteps - 1)

  const zeroedLarge = await next65536Epoch({ ...ratchet, large: largePre }, ctx) // TODO Remove extra freezing
  const newN = n - (65536 * (largeSteps - 1)) - (65536 - 256 * (ratchet.mediumCounter + 1)) - (256 - ratchet.smallCounter)

  if (newN < 256) {
    return await incBySmall(ratchet, newN, ctx)
  }

  return await incByMedium(zeroedLarge, newN, ctx)
}

async function incByMedium(ratchet: SpiralRatchet, n: number, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  const target = n + ratchet.smallCounter
  const mediumSteps = Math.floor(target / 256)

  const mediumPre = await shaN(webcrypto, ratchet.medium, mediumSteps - 1)
  const zeroedMedium = await next256Epoch({
    ...ratchet,
    medium: mediumPre,
    mediumCounter: ratchet.mediumCounter + mediumSteps - 1
  }, ctx)

  const newN = n - (256 * (mediumSteps - 1)) - (256 - ratchet.smallCounter)
  return await incBySmall(zeroedMedium, newN, ctx) // TODO Fix extra freezing
}

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

export function complement(array: ArrayBuffer): ArrayBuffer {
  return new Uint8Array(array).map(n => n ^ 0xFF).buffer
}
