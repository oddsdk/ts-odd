export const rmKeyFromObj = <T>(obj: {[k: string]: T}, key: string): {[k: string]: T} => {
  const { [key]: omit, ...rest } = obj
  return rest
}

export const mapObj = <T, S>(obj: {[k: string]: T}, fn: (t: T, k?: string) => S): {[k: string]: S}  => {
  const newObj = {} as {[key: string]: S}
  Object.entries(obj).forEach(([key, value]) => {
    newObj[key] = fn(value, key)
  })
  return newObj
}

export const mapObjAsync = async <T, S>(obj: {[k: string]: T}, fn: (t: T, k?: string) => Promise<S>): Promise<{[k: string]: S}> => {
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
