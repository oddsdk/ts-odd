import { Maybe } from "./types.js"

export const removeKeyFromObj = <T> (
    obj: {[key: string]: T},
    key: string
  ): {[key: string]: T} => {
  const { [key]: omit, ...rest } = obj // eslint-disable-line
  return rest
}

export const updateOrRemoveKeyFromObj = <T> (
    obj: {[key: string]: T},
    key: string,
    val: Maybe<T>
  ): {[key: string]: T} => (
  val === null
    ? removeKeyFromObj(obj, key)
    : {
      ...obj,
      [key]: val
    }
)

export const mapObj = <T, S> (
    obj: {[key: string]: T},
    fn: (val: T, key: string) => S
  ): {[key: string]: S}  => {
  const newObj = {} as {[key: string]: S}
  Object.entries(obj).forEach(([key, value]) => {
    newObj[key] = fn(value, key)
  })
  return newObj
}

export const mapObjAsync = async <T, S> (
    obj: {[key: string]: T},
    fn: (val: T, key: string) => Promise<S>
  ): Promise<{[key: string]: S}> => {
  const newObj = {} as {[key: string]: S}
  await Promise.all(
    Object.entries(obj).map(async ([key, value]) => {
      newObj[key] = await fn(value, key)
    })
  )
  return newObj
}

export const arrContains = <T>(arr: T[], val: T): boolean => {
  return arr.indexOf(val) > -1
}

export const asyncWaterfall = async <T>(val: T, operations: ((val: T) => Promise<T>)[]): Promise<T> => {
  let acc = val
  for(let i=0; i<operations.length; i++){
    acc = await operations[i](acc)
  }
  return acc
}
