export const notNull = <T>(obj: T | null): obj is T => {
  return obj !== null
}

export const mapObj = <T, S>(obj: {[k: string]: T}, fn: (t: T) => S): {[k: string]: S}  => {
  const newObj = {} as {[key: string]: S}
  Object.entries(obj).forEach(([key, value]) => {
    newObj[key] = fn(value)
  })
  return newObj
}

export const mapObjAsync = async <T, S>(obj: {[k: string]: T}, fn: (t: T) => Promise<S>): Promise<{[k: string]: S}> => {
  const newObj = {} as {[key: string]: S}
  await Promise.all(
    Object.entries(obj).map(async ([key, value]) => {
      newObj[key] = await fn(value)
    })
  )
  return newObj
}

export const blobToBuffer = async (blob: Blob): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new Error("Failed to read file"))
    const reader = new FileReader()
    reader.addEventListener('load', (e) => {
      const arrbuf = e?.target?.result || null
      if(arrbuf === null){
        fail()
      }
      resolve(Buffer.from(arrbuf as ArrayBuffer))
    })
    reader.addEventListener('error', () => reader.abort())
    reader.addEventListener('abort', fail)
    reader.readAsArrayBuffer(blob)
  })
}

export const isBlob = (obj: any): obj is Blob => {
  if (typeof Blob === 'undefined') {
    return false
  }
  return obj instanceof Blob || obj.constructor.name === 'Blob'
}

export default {
  notNull,
  mapObj,
  mapObjAsync,
  blobToBuffer,
  isBlob
}
