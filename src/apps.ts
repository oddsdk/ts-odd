import localforage from 'localforage'

import * as did from './did'
import * as dns from './dns'
import * as ucan from './ucan'
import { api, Maybe, isDefined } from './common'
import { CID } from './ipfs'
import { setup } from './setup/internal'


export type App = {
  domain: string
}

/**
 * Get A list of all of your apps and their associated domain names
 */
export async function index(): Promise<Array<App>> {
  const apiEndpoint = setup.endpoints.api

  const jwt = await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
    proof: undefined, // TODO: Waiting on API changes
    potency: null
  })

  const response = await fetch(`${apiEndpoint}/app`, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${jwt}`
    }
  })

  const data = await response.json();
  return data
}

/**
 * Creates a new app, assigns an initial subdomain, and sets an asset placeholder
 *
 * @param subdomain Subdomain to create the fission app with
 */
export async function create(
  subdomain: Maybe<string>
): Promise<App> {
  const apiEndpoint = setup.endpoints.api

  const jwt = await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
    proof: undefined, // TODO: Waiting on API changes
    potency: null
  })

  const url = isDefined(subdomain) ? `${apiEndpoint}/app?${subdomain}` : `${apiEndpoint}/app`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${jwt}`
    }
  })
  const data = await response.json();
  return data
}

/**
 * Destroy app by any associated URL
 *
 * @param url The url we want to delete
 */
export async function deleteByURL(
  url: string
): Promise<void> {
  const apiEndpoint = setup.endpoints.api

  const jwt = await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
    proof: undefined, // TODO: Waiting on API changes
    potency: null
  })

  await fetch(`${apiEndpoint}/app/associated/${url}`, {
    method: 'DELETE',
    headers: {
      'authorization': `Bearer ${jwt}`
    }
  })
}
