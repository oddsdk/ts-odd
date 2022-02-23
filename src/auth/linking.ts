import * as debug from "../common/debug.js"
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

export const handleLinkingError = (error: LinkingError | LinkingWarning): void => {
  switch (error.name) {
    case "LinkingWarning":
      debug.warn(error.message)
      break

    case "LinkingError":
      throw error

    default:
      throw error
  }
}