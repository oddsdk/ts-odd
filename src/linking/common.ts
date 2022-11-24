import type { Result } from "../common/types.js"
import * as Manners from "../components/manners/implementation.js"


export enum LinkingStep {
  Broadcast = "BROADCAST",
  Negotiation = "NEGOTIATION",
  Delegation = "DELEGATION"
}

export class LinkingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LinkingError"
  }
}

export class LinkingWarning extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LinkingWarning"
  }
}

export const handleLinkingError = (manners: Manners.Implementation, error: LinkingError | LinkingWarning): void => {
  switch (error.name) {
    case "LinkingWarning":
      manners.warn(error.message)
      break

    case "LinkingError":
      throw error

    default:
      throw error
  }
}

export const tryParseMessage = <T>(
  data: string,
  typeGuard: (message: unknown) => message is T,
  context: { participant: string; callSite: string }
): Result<T, LinkingWarning> => {
  try {
    const message = JSON.parse(data)

    if (typeGuard(message)) {
      return {
        ok: true,
        value: message
      }
    } else {
      return {
        ok: false,
        error: new LinkingWarning(`${context.participant} received an unexpected message in ${context.callSite}: ${data}. Ignoring message.`)
      }
    }

  } catch {
    return {
      ok: false,
      error: new LinkingWarning(`${context.participant} received a message in ${context.callSite} that it could not parse: ${data}. Ignoring message.`)
    }
  }
}