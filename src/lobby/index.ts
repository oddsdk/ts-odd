import * as did from "../did/index.js"
import * as ucan from "../ucan/index.js"
import * as ucanStore from "../ucan/store.js"
import { ShareDetails } from "../fs/types.js"
import { api } from "../common/index.js"
import { setup } from "../setup/internal.js"
import RootTree from "../fs/root/tree.js"

export * from "./username.js"


/**
 * Create a user account.
 */
export async function createAccount(
  userProps: {
    email: string
    username: string
  }
): Promise<{ success: boolean }> {
  const apiEndpoint = setup.getApiEndpoint()

  const jwt = ucan.encode(await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
  }))

  const response = await fetch(`${apiEndpoint}/user`, {
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
 * Ask the fission server to send another verification email to the
 * user currently logged in.
 *
 * Throws if the user is not logged in.
 */
export async function resendVerificationEmail(): Promise<{ success: boolean }> {
  const apiEndpoint = setup.getApiEndpoint()

  // We've not implemented an "administer account" resource/ucan, so authenticating
  // with any kind of ucan will work server-side
  const localUcan = Object.values(ucanStore.getDictionary())[0]
  if (localUcan === null) {
    throw "Could not find your local UCAN"
  }

  const jwt = ucan.encode(await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
    proof: localUcan,
    potency: null
  }))

  const response = await fetch(`${apiEndpoint}/user/email/resend`, {
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
export function shareLink(details: ShareDetails): string {
  return setup.endpoints.lobby +
    "/#/share/" +
    encodeURIComponent(details.sharedBy.username) + "/" +
    encodeURIComponent(details.shareId) + "/"
}


/**
 * Store the read key for the root `PrivateTree` (ie. `/private`)
 */
export function storeFileSystemRootKey(key: string): Promise<void> {
  return RootTree.storeRootKey(key)
}
