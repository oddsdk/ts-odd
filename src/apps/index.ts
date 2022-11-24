import type { CID } from "multiformats/cid"

import * as Crypto from "../components/crypto/implementation.js"
import * as DID from "../did/index.js"
import * as Fission from "../common/fission.js"
import * as Reference from "../components/reference/implementation.js"
import * as Ucan from "../ucan/index.js"

import { Maybe } from "../common/types.js"
import { isString } from "../common/type-checks.js"


export type AppMetadata = {
  domains: string[]
  insertedAt: string
  modifiedAt: string
}

type AppIndexResponseJson = {
  [ k: number ]: {
    insertedAt: string
    modifiedAt: string
    urls: string[]
  }
}

export type Dependencies = {
  crypto: Crypto.Implementation
  reference: Reference.Implementation
}


/**
 * Get A list of all of your apps and their associated domain names
 */
export async function index(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies
): Promise<Array<AppMetadata>> {
  const localUcan = await dependencies.reference.repositories.ucans.lookupAppUcan("*")
  if (localUcan === null) {
    throw "Could not find your local UCAN"
  }

  const jwt = Ucan.encode(await Ucan.build({
    dependencies: dependencies,
    audience: await Fission.did(endpoints),
    issuer: await DID.ucan(dependencies.crypto),
    proof: localUcan,
    potency: null
  }))

  const response = await fetch(Fission.apiUrl(endpoints, "/app"), {
    method: "GET",
    headers: {
      "authorization": `Bearer ${jwt}`
    }
  })

  const data: AppIndexResponseJson = await response.json()

  return Object
    .values(data)
    .filter(v => v.urls.length > 0)
    .map(({ urls, insertedAt, modifiedAt }) => ({ domains: urls, insertedAt, modifiedAt }))
}

/**
 * Creates a new app, assigns an initial subdomain, and sets an asset placeholder
 *
 * @param subdomain Subdomain to create the fission app with
 */
export async function create(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  subdomain: Maybe<string>
): Promise<AppMetadata> {
  const localUcan = await dependencies.reference.repositories.ucans.lookupAppUcan("*")
  if (localUcan === null) {
    throw "Could not find your local UCAN"
  }

  const jwt = Ucan.encode(await Ucan.build({
    dependencies,

    audience: await Fission.did(endpoints),
    issuer: await DID.ucan(dependencies.crypto),
    proof: localUcan,
    potency: null
  }))

  const url = isString(subdomain)
    ? Fission.apiUrl(endpoints, `/app?subdomain=${encodeURIComponent(subdomain)}`)
    : Fission.apiUrl(endpoints, `/app`)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${jwt}`
    }
  })

  const data = await response.json()
  const nowIso = (new Date()).toISOString()

  return {
    domains: [ data ],
    insertedAt: nowIso,
    modifiedAt: nowIso
  }
}

/**
 * Destroy app by any associated domain
 *
 * @param domain The domain associated with the app we want to delete
 */
export async function deleteByDomain(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  domain: string
): Promise<void> {
  const localUcan = await dependencies.reference.repositories.ucans.lookupAppUcan(domain)
  if (localUcan === null) {
    throw new Error("Could not find your local UCAN")
  }

  const jwt = Ucan.encode(await Ucan.build({
    dependencies,

    audience: await Fission.did(endpoints),
    issuer: await DID.ucan(dependencies.crypto),
    proof: localUcan,
    potency: null
  }))

  const appIndexResponse = await fetch(Fission.apiUrl(endpoints, "/app"), {
    method: "GET",
    headers: {
      "authorization": `Bearer ${jwt}`
    }
  })

  const index: AppIndexResponseJson = await appIndexResponse.json()
  const appToDelete = Object.entries(index).find(([ _, app ]) => app.urls.includes(domain))
  if (appToDelete == null) {
    throw new Error(`Couldn't find an app with domain ${domain}`)
  }

  await fetch(
    Fission.apiUrl(endpoints, `/app/${encodeURIComponent(appToDelete[ 0 ])}`),
    {
      method: "DELETE",
      headers: {
        "authorization": `Bearer ${jwt}`
      }
    }
  )
}

/**
 * Updates an app by CID
 *
 * @param subdomain Subdomain to create the fission app with
 */
export async function publish(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  domain: string,
  cid: CID,
): Promise<void> {
  const localUcan = await dependencies.reference.repositories.ucans.lookupAppUcan(domain)
  if (localUcan === null) {
    throw "Could not find your local UCAN"
  }

  const jwt = Ucan.encode(await Ucan.build({
    dependencies,

    audience: await Fission.did(endpoints),
    issuer: await DID.ucan(dependencies.crypto),
    proof: localUcan,
    potency: null
  }))

  const url = Fission.apiUrl(endpoints, `/app/${domain}/${cid}`)

  await fetch(url, {
    method: "PUT",
    headers: {
      "authorization": `Bearer ${jwt}`
    }
  })
}
