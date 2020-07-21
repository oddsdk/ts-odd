/** @internal */

/** @internal */
import { Links } from '../types'
import { isString } from '../../common/type-checks'

import { isValue, Maybe } from '../../common'
import ipfs, { CID } from '../../ipfs'

import * as basic from './basic'


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
export const getAndCheckValue = async <T>(
  linksOrCid: Links | CID,
  name: string,
  key: Maybe<string>,
  checkFn: (val: any) => val is T,
  canBeNull = false
): Promise<T> => {
  const val = await getValue(linksOrCid, name, key)
  return checkValue(val, name, checkFn, canBeNull)
}

export const checkValue = <T>(val: any, name: string, checkFn: (val: any) => val is T, canBeNull = false): T => {
  if(!isValue(val)){
    if(canBeNull) return val
    throw new Error(`Could not find header value: ${name}`)
  }
  if(checkFn(val)){
    return val
  }
  throw new Error(`Improperly formatted header value: ${name}`)
}
