import * as crypto from "../crypto/index.js"
import * as identifiers from "../common/identifiers.js"
import * as pathing from "../path.js"
import * as ucanPermissions from "../ucan/permissions.js"

import { Permissions } from "../ucan/permissions.js"

import { AppState } from "./state/app.js"
import { LinkedAppState } from "./state/linkedApp.js"


// STATE

export type State = AppState | LinkedAppState


export const isAppState = (state: State): state is AppState => {
  return state.kind === "appState"
}

export const isLinkedAppState = (state: State): state is LinkedAppState => {
  return state.kind === "linkedAppState"
}

// VALIDATION


export async function validateSecrets(permissions: Permissions): Promise<boolean> {
  return ucanPermissions.paths(permissions).reduce(
    (acc, path) => acc.then(async bool => {
      if (bool === false) return bool
      if (pathing.isBranch(pathing.Branch.Public, path)) return bool

      const keyName = await identifiers.readKey({ path })
      return await crypto.keystore.keyExists(keyName)
    }),
    Promise.resolve(true)
  )
}
