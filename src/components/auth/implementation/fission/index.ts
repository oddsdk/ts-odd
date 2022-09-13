import * as did from "../../../../did/index.js"
import * as ucan from "../../../../ucan/index.js"
import * as ucanStore from "../../../../ucan/store.js"
import { ShareDetails } from "../../../../fs/types.js"
import { api } from "../../../../common/index.js"

import * as Crypto from "../../../crypto/implementation.js"
import { USERNAME_BLOCKLIST } from "./blocklist.js"
import { Endpoints } from "../../../../common/fission.js"
import { Dependents } from "../../implementation.js"


export * from "../../../../common/fission.js"


/**
 * Create a user account.
 */
export async function createAccount(
  endpoints: Endpoints,
  dependents: Dependents,
  userProps: {
    username: string
    email?: string
  }
): Promise<{ success: boolean }> {
  const jwt = ucan.encode(await ucan.build({
    audience: await api.did(endpoints),
    issuer: await did.ucan(dependents.crypto),
  }))

  const response = await fetch(`${endpoints.api}/user`, {
    method: "PUT",
    headers: {
      "authorization": `Bearer ${jwt}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(userProps)
  })

  return {
    success: response.status < 300
  }
}


/**
 * Check if a username is available.
 */
export async function isUsernameAvailable(
  endpoints: Endpoints,
  username: string
): Promise<boolean> {
  const resp = await fetch(`${endpoints.api}/user/data/${username}`)
  return !resp.ok
}


/**
 * Check if a username is valid.
 */
export function isUsernameValid(username: string): boolean {
  return !username.startsWith("-") &&
    !username.endsWith("-") &&
    !username.startsWith("_") &&
    /^[a-zA-Z0-9_-]+$/.test(username) &&
    !USERNAME_BLOCKLIST.includes(username.toLowerCase())
}


/**
 * Ask the fission server to send another verification email to the
 * user currently logged in.
 *
 * Throws if the user is not logged in.
 */
export async function resendVerificationEmail(
  endpoints: Endpoints,
  crypto: Crypto.Implementation
): Promise<{ success: boolean }> {
  // We've not implemented an "administer account" resource/ucan, so authenticating
  // with any kind of ucan will work server-side
  const localUcan = Object.values(ucanStore.getDictionary())[ 0 ]
  if (localUcan === null) {
    throw "Could not find your local UCAN"
  }

  const jwt = ucan.encode(await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(crypto),
    proof: localUcan,
    potency: null
  }))

  const response = await fetch(`${endpoints.api}/user/email/resend`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${jwt}`
    }
  })
  return {
    success: response.status < 300
  }
}


/**
 * Create a share link.
 * There people can "accept" a share,
 * copying the soft links into their private filesystem.
 */
export function shareLink(endpoints: Endpoints, details: ShareDetails): string {
  return endpoints.lobby +
    "/#/share/" +
    encodeURIComponent(details.sharedBy.username) + "/" +
    encodeURIComponent(details.shareId) + "/"
}
