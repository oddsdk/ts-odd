/** @internal */

/** @internal */
import { Links, HeaderV1, SemVer, UnstructuredHeader, PinMap, PutResult } from '../types'
import { isSemVer } from '../types/check'
import { isString, isDefined } from '../../common/type-checks'

import { isValue, Maybe } from '../../common'
import ipfs, { CID, FileContent } from '../../ipfs'
import link from '../link'

import basic from './basic'


export const getValue = async (
  linksOrCID: Links | CID,
  name: string,
  key: Maybe<string>
): Promise<unknown> => {
  if (isString(linksOrCID)) {
    const links = await basic.getLinks(linksOrCID, key)
    return getValueFromLinks(links, name, key)
  }

  return getValueFromLinks(linksOrCID, name, key)
}

export const getValueFromLinks = async (
  links: Links,
  name: string,
  key: Maybe<string>
): Promise<unknown> => {
  const linkCID = links[name]?.cid
  if (!linkCID) return null

  return ipfs.encoded.catAndDecode(linkCID, key)
}


export const getVersion = async (cid: CID, key: Maybe<string>): Promise<SemVer> => {
  const version = await getValue(cid, 'version', key)
  return checkValue(version, isSemVer)
}

/**
 * Stores a DAG structure, optionally encrypted, on IPFS.
 * With the following format:
 *
 * ```javascript
 * {
 *   "index": { "name": "index", "cid": "Qm1", "isFile": false },
 *
 *   // Metadata
 *   "isFile": { "name": "isFile", "cid": "Qm2", "isFile": true },
 *   "mtime": { "name": "mtime", "cid": "Qm2", "isFile": true },
 *   "version": { "name": "version", "cid": "Qm2", "isFile": true },
 *   ...
 * }
 * ```
 */

const pinMapToList = (pins: PinMap): CID[] => {
  return Object.entries(pins).reduce((acc, cur) => {
    const children = cur[1]
    return [
      ...acc,
      ...children
    ]
  }, [] as CID[])
}

export const put = async (
    index: CID,
    header: HeaderV1,
    key: Maybe<string>
  ): Promise<PutResult> => {
  const noUndefined = Object.entries(header)
    .filter( ([_, v]) => isDefined(v))
  const linksArr = await Promise.all(
    noUndefined.map(async([name, val]) => {
      const { cid, size } = await ipfs.encoded.add(val as FileContent, key)
      return { name, cid, isFile: true, size }
    })
  )
  linksArr.push({
    name: 'index',
    cid: index,
    isFile: false,
    size: header.size
  })
  const links = link.arrToMap(linksArr)
  const cid = await basic.putLinks(links, key)
  const pinsForHeader = linksArr.map(l => l.cid)
  const pins = [
    ...pinsForHeader,
    ...pinMapToList(header.pins),
    cid
  ]
  return { cid, pins }
}

type HeaderAndIndex = {
  index: string
  header: UnstructuredHeader
}

export const getHeaderAndIndex = async (
    cid: CID,
    parentKey: Maybe<string>,
    valuesToGet: string[]
  ): Promise<HeaderAndIndex> => {
    const links = await basic.getLinks(cid, parentKey)
    const index = links['index']?.cid
    const header = await getHeader(links, parentKey, valuesToGet)
    if(!isString(index)) {
      throw new Error(`Could not find index for node at: ${cid}`)
    }

    return { index, header }
}

export const getHeader = async (
    links: Links,
    parentKey: Maybe<string>,
    valuesToGet: string[]
  ): Promise<UnstructuredHeader> => {
  let values = [] as unknown []
  for(let i=0; i<valuesToGet.length; i++) {
    values.push(await getValue(links, valuesToGet[i], parentKey))

  }
  return valuesToGet.reduce((acc, cur, i) => {
    const value = values[i]
    acc[cur] = value
    return acc
  }, {} as UnstructuredHeader)
}

export const checkValue = <T>(val: any, checkFn: (val: any) => val is T, canBeNull = false): T => {
  if(!isValue(val)){
    if(canBeNull) return val
    throw new Error('Could not find necessary header value')
  }
  if(checkFn(val)){
    return val
  }
  throw new Error('Improper header value')
}

export default {
  getValue,
  getValueFromLinks,
  put,
  getVersion,
  getHeaderAndIndex,
}
