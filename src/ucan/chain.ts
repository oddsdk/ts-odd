import { Capability, Dictionary, Facts, Ucan } from "./types.js"

export function listCapabilities(
  ucan: Ucan,
  dict: Dictionary,
): Capability[] {
  const caps = ucan.payload.att
  const proofs = ucan.payload.prf.map(cid => dict[cid])

  return proofs.reduce(
    (acc: Capability[], maybeUcan): Capability[] => {
      if (maybeUcan) return [...acc, ...listCapabilities(maybeUcan, dict)]
      return acc
    },
    caps,
  )
}

export function listFacts(
  ucan: Ucan,
  dict: Dictionary,
): Facts {
  const facts = (ucan.payload.fct || []).reduce((acc, f) => {
    return { ...acc, ...f }
  }, {})

  const proofs = ucan.payload.prf.map(cid => dict[cid])

  return proofs.reduce(
    (acc: Facts, maybeUcan): Facts => {
      if (maybeUcan) return { ...acc, ...listFacts(maybeUcan, dict) }
      return acc
    },
    facts,
  )
}
