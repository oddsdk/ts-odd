import { Capability } from "./types.js"


export const DELEGATE_ALL_PROOFS: Capability = {
  with: { scheme: "ucan", hierPart: "./*" },
  can: { namespace: "ucan", segments: [ "*" ] }
}