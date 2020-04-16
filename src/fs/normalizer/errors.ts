import { CID } from '../../ipfs'

export class DecodingError extends Error { }

export class ContentTypeMismatchError extends DecodingError {
  constructor(cid: CID) {
    super(`Content type does not match: ${cid}`)
    this.name = "ContentTypeMismatchError"
  }
}

export class LinkDoesNotExistError extends DecodingError {
  constructor(name: string) {
    super(`Link does not exist: ${name}`)
    this.name = "LinkDoesNotExistError"
  }
}

export const isDecodingError = (obj: any): obj is DecodingError => {
  return obj instanceof DecodingError
}

export const defaultError = <T>(maybeErr: T | DecodingError, def: T): T => {
  return isDecodingError(maybeErr) ? def : maybeErr
}

export default {
  ContentTypeMismatchError,
  LinkDoesNotExistError,
  isDecodingError,
  defaultError,
}
