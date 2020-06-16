export const isDefined = <T>(val: T | undefined): val is T => {
  return val !== undefined
}

export const notNull = <T>(val: T | null): val is T => {
  return val !== null
}

export const isJust = notNull

export const isValue = <T>(val: T | undefined | null): val is T => {
  return isDefined(val) && notNull(val)
}

export const isBool = (val: unknown): val is boolean => {
  return typeof val === 'boolean'
}

export const isNum = (val: unknown): val is number => {
  return typeof val === 'number'
}

export const isString = (val: unknown): val is string => {
  return typeof val === 'string'
}

export const isObject = <T>(val: unknown): val is Record<string, T> => {
  return val !== null && typeof val === 'object'
}

export const isBlob = (val: unknown): val is Blob => {
  if (typeof Blob === 'undefined') return false
  return val instanceof Blob || (isObject(val) && val?.constructor?.name === 'Blob')
}
