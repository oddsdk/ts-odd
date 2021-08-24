import { EncryptionContext } from "./context.js"

interface SpiralRatchet {
  large: ArrayBuffer

  medium: ArrayBuffer
  mediumCounter: number

  small: ArrayBuffer
  smallCounter: number
}


export async function setup(ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto, crypto } = ctx
  let [mediumSkip, smallSkip] = crypto.getRandomValues(new Uint32Array(2))
  mediumSkip = mediumSkip % 255
  smallSkip = smallSkip % 255

  const ratchet = await zero(ctx)

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


export async function incAt1(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  if (ratchet.smallCounter >= 255) {
    return await incAt256(ratchet, ctx)
  }

  return Object.freeze({
    ...ratchet,
    small: await sha(webcrypto, ratchet.small), // NOTE: this uses the input ratchet
    smallCounter: ratchet.smallCounter + 1,
  })
}

export async function incAt256(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  if (ratchet.mediumCounter >= 255) {
    return await incAt65536(ratchet, ctx)
  }

  return Object.freeze({
    ...ratchet,

    medium: await sha(webcrypto, ratchet.medium), // NOTE: this uses the input ratchet
    mediumCounter: ratchet.mediumCounter + 1,

    small: await sha(webcrypto, complement(ratchet.medium)),
    smallCounter: 0
  })
}

export async function incAt65536(ratchet: SpiralRatchet, cryptoCtx: EncryptionContext): Promise<SpiralRatchet> {
  return await zero(cryptoCtx, ratchet.large)
}

export async function incBy(ratchet: SpiralRatchet, cryptoCtx: EncryptionContext, n: number): Promise<SpiralRatchet> {
  const { webcrypto } = cryptoCtx
  const { smallCounter, mediumCounter } = ratchet

  const currentInEpoch = mediumCounter * 256 + smallCounter
  const movingTo = n + currentInEpoch

  if (movingTo === 0) {
    return ratchet
  }

  if (movingTo < 256) {
    const small = await shaN(webcrypto, ratchet.small, n)
    return Object.freeze({
      ...ratchet,
      small,
      smallCount: n
    })
  }

  if (movingTo < 65536) {
    const mediumSteps = Math.floor(n / 256)
    const mediumPre = await shaN(webcrypto, ratchet.medium, mediumSteps)
    const zeroedMedium = await incAt256({ ...ratchet, medium: mediumPre }, cryptoCtx)
    return await incBy(zeroedMedium, cryptoCtx, n % 256) // TODO Fix extra freezing
  }

  const largeSteps = Math.floor(n / 65536)
  const largePre = await shaN(webcrypto, ratchet.large, largeSteps - 1)

  const zeroedLarge = await incAt65536({...ratchet, large: largePre}, cryptoCtx) // TODO Fix extra freezing
  return await incBy(zeroedLarge, cryptoCtx, n % 65536)
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
