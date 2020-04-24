
export const isDefined = <T>(val: T | undefined): val is T => {
  return val !== undefined
}
export const notNull = <T>(obj: T | null): obj is T => {
  return obj !== null
}

export const isBool = (obj: any): obj is boolean => {
  return typeof obj === 'boolean'
}

export const isNum = (obj: any): obj is number => {
  return typeof obj === 'number'
}

export const isString = (obj: any): obj is string => {
  return typeof obj === 'string'
}

export const isObject = (obj: any): obj is object => {
  return obj !== null && typeof obj === 'object'
}

export const isBlob = (obj: any): obj is Blob => {
  if (typeof Blob === 'undefined') {
    return false
  }
  return obj instanceof Blob || obj.constructor.name === 'Blob'
}

export default {
  isDefined,
  notNull,
  isBool,
  isNum,
  isString,
  isObject,
  isBlob,
}
