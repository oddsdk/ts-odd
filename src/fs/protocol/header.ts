/** @internal */

/** @internal */
import { Links } from '../types'
import { isString } from '../../common/type-checks'

import { isValue } from '../../common'
import ipfs, { CID } from '../../ipfs'

import * as basic from './basic'


export const getValue = async (
  linksOrCID: Links | CID,
  name: string,
): Promise<unknown> => {
  if (isString(linksOrCID)) {
    const links = await basic.getLinks(linksOrCID)
    return getValueFromLinks(links, name)
  }

  return getValueFromLinks(linksOrCID, name)
}

export const getValueFromLinks = async (
  links: Links,
  name: string,
): Promise<unknown> => {
  const linkCID = links[name]?.cid
  if (!linkCID) return null

  return ipfs.encoded.catAndDecode(linkCID, null)
}
export const getAndCheckValue = async <T>(
  linksOrCid: Links | CID,
  name: string,
  checkFn: (val: any) => val is T,
  canBeNull = false
): Promise<T> => {
  const val = await getValue(linksOrCid, name)
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
