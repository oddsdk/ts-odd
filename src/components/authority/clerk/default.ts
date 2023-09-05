import { ed25519 } from "@noble/curves/ed25519"
import { tag } from "iso-base/varint"
import { base58btc } from "multiformats/bases/base58"

import * as AgentDID from "../../../agent/did.js"
import * as Path from "../../../path/index.js"
import * as Tickets from "../../../ticket/index.js"
import * as Ucan from "../../../ucan/ts-ucan/index.js"
import * as Agent from "../../agent/implementation.js"
import * as Identifier from "../../identifier/implementation.js"

import { Ticket } from "../../../ticket/types.js"
import { Clerk } from "../implementation.js"

///////////
// CLERK //
///////////

export async function createOriginFileSystemTicket(
  path: Path.DistinctivePath<Path.Segments>,
  audience: string
): Promise<Ticket> {
  const privateKey = ed25519.utils.randomPrivateKey()
  const publicKey = ed25519.getPublicKey(privateKey)

  const did = `did:key:${base58btc.encode(tag(0xed, publicKey))}`

  const ucan = await Ucan.build({
    // from & to
    issuer: {
      did: () => did,
      jwtAlg: "EdDSA",
      sign: async (data: Uint8Array) => ed25519.sign(data, privateKey),
    },
    audience,

    // capabilities
    capabilities: [
      {
        with: { scheme: "wnfs", hierPart: `//${did}${Path.toPosix(path, { absolute: true })}` },
        can: { namespace: "fs", segments: ["*"] },
      },
    ],
  })

  return Ucan.toTicket(ucan)
}

export async function identifierToAgentDelegation(
  identifier: Identifier.Implementation,
  agent: Agent.Implementation,
  proofs: Ticket[]
): Promise<Ticket> {
  const identifierDID = await identifier.did()
  const ucan = await Ucan.build({
    issuer: {
      did: () => identifierDID,
      jwtAlg: await identifier.ucanAlgorithm(),
      sign: identifier.sign,
    },
    audience: await AgentDID.signing(agent),
    proofs: await Promise.all(proofs.map(t => Tickets.cid(t).toString())),
  })

  return Ucan.toTicket(ucan)
}

export function matchFileSystemTicket(
  path: Path.DistinctivePath<Path.Segments>,
  did: string
): (ticket: Ticket) => boolean {
  return (ticket: Ticket): boolean => {
    const hierPart = `//${did}/${Path.toPosix(path)}`
    const ucan = Ucan.decode(ticket.token)

    return !!ucan.payload.att.find(cap => {
      return cap.with.hierPart === hierPart && (cap.can === "*" || cap.can.namespace === "fs")
    })
  }
}

////////
// 🛳️ //
////////

export function implementation(): Clerk {
  return {
    tickets: {
      fileSystem: {
        origin: createOriginFileSystemTicket,
        matcher: matchFileSystemTicket,
      },
      misc: {
        identifierToAgentDelegation,
      },
    },
  }
}
