import _, { isString } from 'lodash'

import { BasicLinks, Links, Header, Metadata, SemVer, NodeMap } from '../types'
import { isSemVer, isNodeMap } from '../types/check'

import { mapObjAsync, isValue, Maybe, isBool, isNum } from '../../common'
import ipfs, { CID } from '../../ipfs'
import { HeaderValue } from '../header'

// Filesystem

import link from '../link'
import semver from '../semver'

// Normalizer

import basic from './basic'

import {
  isDecodingError,
  DecodingError,
  LinkDoesNotExistError,
  ContentTypeMismatchError
} from './errors'


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

export const put = async (index: CID, header: Header, key: Maybe<string>): Promise<CID> => {
  const noUndefined = _.pickBy(header, isValue)
  const linksArr = await Promise.all(
    _.map(noUndefined, async (val, name) => {
      const { cid, size } = await ipfs.encoded.add(val, key)
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
  return basic.putLinks(links, key)
}

export const getVersion = async (cid: CID, key: Maybe<string>): Promise<SemVer> => {
  const version = await getValue(cid, 'version', key)
  return checkValue(version, isSemVer)
}

export const interpolateMetadata = async (
  links: BasicLinks,
  getMetadata: (cid: CID) => Promise<Metadata>
): Promise<Links> => {
  return mapObjAsync(links, async (link) => {
    const { isFile = false, mtime } = await getMetadata(link.cid)
    return {
      ...link,
      isFile,
      mtime
    }
  })
}

export type UnstructuredHeader = { [name: string]: unknown }
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
  interpolateMetadata,
  getHeaderAndIndex,
}
