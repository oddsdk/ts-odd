import CID from "cids"

export type CborForm
  = string
  | number
  | boolean
  | null
  | Uint8Array
  | CID
  | { [key: string]: CborForm }
  | CborForm[]

export function hasProp<K extends PropertyKey>(data: unknown, prop: K): data is Record<K, unknown> {
  return typeof data === "object" && data != null && prop in data
}
