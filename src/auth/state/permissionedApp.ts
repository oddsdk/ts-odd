import FileSystem from "../../fs/index.js"

import { Maybe } from "../../common/types.js"
import { Permissions } from "../../ucan/permissions.js"


// SCENARIO


export enum PermissionedAppScenario {
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
    kind: "permissionedAppState",
    scenario: PermissionedAppScenario.AuthSucceeded,
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
    kind: "permissionedAppState",
    scenario: PermissionedAppScenario.AuthCancelled,
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
    kind: "permissionedAppState",
    scenario: PermissionedAppScenario.Continuation,
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
    kind: "permissionedAppState",
    scenario: PermissionedAppScenario.NotAuthorised,
    permissions,

    authenticated: false
  }
}



// STATE


export type PermissionedAppState
  = NotAuthorised
  | AuthSucceeded
  | AuthCancelled
  | Continuation


type PermissionedAppBase = {
  kind: "permissionedAppState"
}


export type NotAuthorised = PermissionedAppBase & {
  scenario: PermissionedAppScenario.NotAuthorised
  permissions: Maybe<Permissions>

  authenticated: false
}

export type AuthSucceeded = PermissionedAppBase & {
  scenario: PermissionedAppScenario.AuthSucceeded
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: boolean
  throughLobby: true
  username: string

  fs?: FileSystem
}

export type AuthCancelled = PermissionedAppBase & {
  scenario: PermissionedAppScenario.AuthCancelled
  permissions: Maybe<Permissions>

  authenticated: false
  cancellationReason: string
  throughLobby: true
}

export type Continuation = PermissionedAppBase & {
  scenario: PermissionedAppScenario.Continuation
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: false
  throughLobby: false
  username: string

  fs?: FileSystem
}
