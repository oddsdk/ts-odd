export type Maybe<T> = T | null

// https://codemix.com/opaque-types-in-javascript/
export type Opaque<K, T> = T & { __TYPE__: K }

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }