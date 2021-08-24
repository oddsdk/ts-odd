import { EncryptionContext } from "./context.js"

export interface SpiralRatchet {
  large: ArrayBuffer

  medium: ArrayBuffer
  mediumCounter: number

  small: ArrayBuffer
  smallCounter: number
}


export async function setup(ctx: EncryptionContext, seed?: ArrayBuffer, ffSmall?: number, ffMedium?: number): Promise<SpiralRatchet> {
  const { webcrypto, crypto } = ctx
  let [mediumSkip, smallSkip] = crypto.getRandomValues(new Uint32Array(2))
  mediumSkip = ffMedium === undefined ? mediumSkip % 256 : ffMedium
  smallSkip = ffSmall === undefined ? smallSkip % 256 : ffSmall

  const ratchet = await zero(ctx, seed)

  return Object.freeze({
    ...ratchet,
    medium: await shaN(webcrypto, ratchet.medium, mediumSkip),
    mediumCounter: mediumSkip,
    small: await shaN(webcrypto, ratchet.small, smallSkip),
    smallCounter: smallSkip,
  })
}

async function zero({ webcrypto, crypto }: EncryptionContext, seed?: ArrayBuffer): Promise<SpiralRatchet> {
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
  return await zero(ctx, ratchet.large)
}

export async function incBy(ratchet: SpiralRatchet, ctx: EncryptionContext, n: number, smCarry?: number): Promise<SpiralRatchet> {
  const { smallCounter, mediumCounter } = ratchet
  if (n <= 0) return ratchet
  if (n < 256 - ratchet.smallCounter) return await incBySmall(ratchet, ctx, n)
  if (n < 65536 - ratchet.mediumCounter * 256 - ratchet.smallCounter) return await incByMedium(ratchet, ctx, n)
  return await incByLarge(ratchet, ctx, n)
}

async function incByLarge(ratchet: SpiralRatchet, ctx: EncryptionContext, n: number): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  const target = n + 256 * ratchet.mediumCounter + ratchet.smallCounter

  const largeSteps = Math.floor(target / 65536)
  const largePre = await shaN(webcrypto, ratchet.large, largeSteps - 1)

  const zeroedLarge = await next65536Epoch({...ratchet, large: largePre}, ctx) // TODO Remove extra freezing
  const newN = n - (65536 * (largeSteps - 1)) - (65536 - 256 * (ratchet.mediumCounter + 1)) - (256 - ratchet.smallCounter)

  if (newN < 256) {
    return await incBySmall(ratchet, ctx, newN)
  }

  return await incByMedium(zeroedLarge, ctx, newN)
}

async function incByMedium(ratchet: SpiralRatchet, ctx: EncryptionContext, n: number): Promise<SpiralRatchet> {
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
  return await incBySmall(zeroedMedium, ctx, newN) // TODO Fix extra freezing
}

async function incBySmall(ratchet: SpiralRatchet, { webcrypto }: EncryptionContext, n: number): Promise<SpiralRatchet> {
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
