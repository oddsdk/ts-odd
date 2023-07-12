import { CID } from "../../common/cid.js"

export type PrivateReference = {
  label: Uint8Array
  temporalKey: Uint8Array
  contentCID: CID
}
