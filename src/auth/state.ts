import FileSystem from "../fs/index.js"

import * as crypto from "../crypto/index.js"
import * as identifiers from "../common/identifiers.js"
import * as pathing from "../path.js"
import * as ucanPermissions from "../ucan/permissions.js"

import { Maybe } from "../common/types.js"
import { Permissions } from "../ucan/permissions.js"


// SCENARIO


export enum Scenario {
  NotAuthorised = "NOT_AUTHORISED",
  AuthSucceeded = "AUTH_SUCCEEDED",
  AuthCancelled = "AUTH_CANCELLED",
  Continuation = "CONTINUATION"
}


export function scenarioAuthSucceeded(
  permissions: Maybe<Permissions>,
  newUser: boolean,
  username: string,
  fs: FileSystem | undefined
): AuthSucceeded {
  return {
    scenario: Scenario.AuthSucceeded,
    permissions,

    authenticated: true,
    throughLobby: true,
    fs,
    newUser,
    username
  }
}

export function scenarioAuthCancelled(
  permissions: Maybe<Permissions>,
  cancellationReason: string
): AuthCancelled {
  return {
    scenario: Scenario.AuthCancelled,
    permissions,

    authenticated: false,
    throughLobby: true,
    cancellationReason
  }
}

export function scenarioContinuation(
  permissions: Maybe<Permissions>,
  username: string,
  fs: FileSystem | undefined
): Continuation {
  return {
    scenario: Scenario.Continuation,
    permissions,

    authenticated: true,
    newUser: false,
    throughLobby: false,
    fs,
    username
  }
}

export function scenarioNotAuthorised(
  permissions: Maybe<Permissions>
): NotAuthorised {
  return {
    scenario: Scenario.NotAuthorised,
    permissions,

    authenticated: false
  }
}



// STATE


export type State
  = NotAuthorised
  | AuthSucceeded
  | AuthCancelled
  | Continuation

export type NotAuthorised = {
  scenario: Scenario.NotAuthorised
  permissions: Maybe<Permissions>

  authenticated: false
}

export type AuthSucceeded = {
  scenario: Scenario.AuthSucceeded
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: boolean
  throughLobby: true
  username: string

  fs?: FileSystem
}

export type AuthCancelled = {
  scenario: Scenario.AuthCancelled
  permissions: Maybe<Permissions>

  authenticated: false
  cancellationReason: string
  throughLobby: true
}

export type Continuation = {
  scenario: Scenario.Continuation
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: false
  throughLobby: false
  username: string

  fs?: FileSystem
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
