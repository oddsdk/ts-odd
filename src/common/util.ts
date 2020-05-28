export const rmKeyFromObj = <T> ( 
    obj: {[key: string]: T},
    key: string
  ): {[key: string]: T} => {
  const { [key]: omit, ...rest } = obj
  return rest
}

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

export default {
  rmKeyFromObj,
  mapObj,
  mapObjAsync,
  arrContains
}
