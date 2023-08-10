import { CID } from "../../common/cid.js"

/** @group File System */
export type PrivateReference = {
  label: Uint8Array
  temporalKey: Uint8Array
  contentCID: CID
}
