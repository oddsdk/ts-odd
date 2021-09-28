import { CID } from "multiformats/cid"

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

export function isRecord(data: unknown): data is Record<PropertyKey, unknown> {
  return typeof data === "object" && data != null
}

export function isRecordOf<V>(data: unknown, isV: (value: unknown) => value is V): data is Record<string, V> {
  if (!isRecord(data)) return false

  for (const [name, value] of Object.entries(data)) {
    if (!isV(value)) {
      return false
    }
  }

  return true
}

export function isNonEmpty(path: string[]): path is [string, ...string[]] {
  return path.length > 0
}

export interface Timestamp {
  now: number
}

export interface AbortContext {
  signal?: AbortSignal
}

export function isCID(something: unknown): something is CID {
  return CID.asCID(something) != null
}

export async function mapRecord<S, T>(record: Record<string, S>, f: (key: string, value: S) => Promise<T>): Promise<Record<string, T>> {
  const newRecord: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    newRecord[key] = await f(key, value)
  }
  return newRecord
}

export function mapRecordSync<S, T>(record: Record<string, S>, f: (key: string, value: S) => T): Record<string, T> {
  const newRecord: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    newRecord[key] = f(key, value)
  }
  return newRecord
}

export async function mapRecordPar<S, T>(record: Record<string, S>, f: (key: string, value: S) => Promise<T>): Promise<Record<string, T>> {
  const newRecord: Record<string, T> = {}
  await Promise.all(Object.entries(record).map(([key, value]) => f(key, value).then(result => newRecord[key] = result)))
  return newRecord
}
