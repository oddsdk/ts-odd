import _ from 'lodash'
import map from 'lodash/map'

import { BasicLinks, Links, Header, Metadata, SemVer } from '../types'
import { isSemVer } from '../types/check'

import { isString, mapObjAsync, isValue, Maybe } from '../../common'
import ipfs, { CID } from '../../ipfs'

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


export const getValue = async <T>(
  linksOrCID: Links | CID,
  name: string,
  checkFn: (obj: any) => obj is T,
  key: Maybe<string>
): Promise<T | DecodingError> => {
  if (typeof linksOrCID === "string") {
    const links = await basic.getLinks(linksOrCID, key)
    return getValueFromLinks(links, name, checkFn, key)
  }

  return getValueFromLinks(linksOrCID, name, checkFn, key)
}

export const getValueFromLinks = async <T>(
  links: Links,
  name: string,
  checkFn: (obj: any) => obj is T,
  key: Maybe<string>
): Promise<T | DecodingError> => {
  const linkCID = links[name]?.cid
  if (!linkCID) return new LinkDoesNotExistError(name)

  const value = await ipfs.encoded.catAndDecode(linkCID, key)
  return checkFn(value) ? value : new ContentTypeMismatchError(linkCID)
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
      const cid = await ipfs.encoded.add(val, key)
      return { name, cid, isFile: true }
    })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr)
  return basic.putLinks(links, key)
}

export const getVersion = async (cid: CID, key: Maybe<string>): Promise<SemVer> => {
  const version = await getValue(cid, 'version', isSemVer, key)
  if (isDecodingError(version)) return semver.v0
  return version
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


export default {
  getValue,
  getValueFromLinks,
  put,
  getVersion,
  interpolateMetadata,
}
