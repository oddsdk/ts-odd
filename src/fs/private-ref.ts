import * as Uint8arrays from "uint8arrays"
import { PrivateRef } from "wnfs"

import * as Agent from "../components/agent/implementation.js"

import { CID, decodeCID, encodeCID } from "../common/cid.js"
import { PrivateReference } from "./types/private-ref.js"


// 🛠️


export function decode(ref: Record<string, string>): PrivateReference {
  return {
    contentCID: decodeCID(ref.contentCID),
    label: Uint8arrays.fromString(ref.label, "base64pad"),
    temporalKey: Uint8arrays.fromString(ref.temporalKey, "base64pad"),
  }
}


export async function decrypt(ref: string, agent: Agent.Implementation): Promise<PrivateReference> {
  // TODO:
  const jsonBytes = Uint8arrays.fromString(ref, "base64pad")
  // const jsonBytes = await agent.decrypt(encrypted)
  const json = Uint8arrays.toString(jsonBytes, "utf8")
  const encoded = JSON.parse(json)
  return decode(encoded)
}


export function encode(ref: PrivateReference): Record<string, string> {
  return {
    contentCID: encodeCID(ref.contentCID),
    label: Uint8arrays.toString(ref.label, "base64pad"),
    temporalKey: Uint8arrays.toString(ref.temporalKey, "base64pad"),
  }
}


export async function encrypt(capsuleRef: PrivateReference, agent: Agent.Implementation): Promise<string> {
  // TODO:
  const encoded = encode(capsuleRef)
  const json = JSON.stringify(encoded)
  const jsonBytes = Uint8arrays.fromString(json, "utf8")
  // const encrypted = await agent.encrypt(jsonBytes)
  // return Uint8arrays.toString(encrypted, "base64pad")
  return Uint8arrays.toString(jsonBytes, "base64pad")
}


/**
 * Translate a `PrivateRef` class instance into a `PrivateReference` object.
 */
export function fromWnfsRef(ref: PrivateRef) {
  return {
    contentCID: CID.decode(ref.getContentCid()),
    label: ref.getLabel(),
    temporalKey: ref.getTemporalKey()
  }
}


/**
 * Translate a `PrivateReference` object into a `PrivateRef` class instance.
 */
export function toWnfsRef(ref: PrivateReference) {
  return new PrivateRef(
    ref.label,
    ref.temporalKey,
    ref.contentCID.bytes
  )
}