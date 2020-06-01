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

export const isBool = (val: any): val is boolean => {
  return typeof val === 'boolean'
}

export const isNum = (val: any): val is number => {
  return typeof val === 'number'
}

export const isString = (val: any): val is string => {
  return typeof val === 'string'
}

export const isObject = <T>(val: any): val is Record<string, T> => {
  return val !== null && typeof val === 'object'
}

export const isBlob = (val: any): val is Blob => {
  if (typeof Blob === 'undefined') {
    return false
  }
  return val instanceof Blob || (isObject(val) && val?.constructor?.name === 'Blob')
}

export default {
  isDefined,
  notNull,
  isValue,
  isJust, 
  isBool,
  isNum,
  isString,
  isObject,
  isBlob,
}
