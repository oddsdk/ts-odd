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

async function zero({ webcrypto, crypto }: EncryptionContext): Promise<SpiralRatchet> {
  const largePre = crypto.getRandomValues(new Uint8Array(32)).buffer
  const medium = await sha(webcrypto, complement(largePre))
  const small = await sha(webcrypto, complement(medium))

  return Object.freeze({
    large: await sha(webcrypto, largePre),
    medium,
    mediumCounter: 0,
    small,
    smallCounter: 0,
  })
}


export async function add1(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  if (ratchet.smallCounter >= 255) {
    // essentially is ratchet-255+256
    return await add256({
      ...ratchet,
      small: await sha(webcrypto, complement(ratchet.medium)),
      smallCounter: 0,
    }, ctx)
  }
  return Object.freeze({
    ...ratchet,
    small: await sha(webcrypto, ratchet.small),
    smallCounter: ratchet.smallCounter + 1,
  })
}

export async function add256(ratchet: SpiralRatchet, ctx: EncryptionContext): Promise<SpiralRatchet> {
  const { webcrypto } = ctx

  if (ratchet.mediumCounter >= 255) {
    // essentially is ratchet-255*256+256*256
    return await add65536({
      ...ratchet,
      medium: await sha(webcrypto, complement(ratchet.large)),
      mediumCounter: 0,
    }, ctx)
  }
  return Object.freeze({
    ...ratchet,
    medium: await sha(webcrypto, ratchet.medium),
    mediumCounter: ratchet.mediumCounter + 1,
  })
}

export async function add65536(ratchet: SpiralRatchet, { webcrypto }: EncryptionContext): Promise<SpiralRatchet> {
  return Object.freeze({
    ...ratchet,
    large: await sha(webcrypto, ratchet.large)
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
