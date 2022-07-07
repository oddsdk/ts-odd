import FileSystem from "../../fs/index.js"

import { Maybe } from "../../common/types.js"
import { Permissions } from "../../ucan/permissions.js"
import { State } from "../state.js"


// SCENARIO


export enum LinkedAppScenario {
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
    kind: "linkedAppState",
    scenario: LinkedAppScenario.AuthSucceeded,
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
    kind: "linkedAppState",
    scenario: LinkedAppScenario.AuthCancelled,
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
    kind: "linkedAppState",
    scenario: LinkedAppScenario.Continuation,
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
    kind: "linkedAppState",
    scenario: LinkedAppScenario.NotAuthorised,
    permissions,

    authenticated: false
  }
}



// STATE


export type LinkedAppState
  = NotAuthorised
  | AuthSucceeded
  | AuthCancelled
  | Continuation


type LinkedAppBase = {
  kind: "linkedAppState"
}


export type NotAuthorised = LinkedAppBase & {
  scenario: LinkedAppScenario.NotAuthorised
  permissions: Maybe<Permissions>

  authenticated: false
}

export type AuthSucceeded = LinkedAppBase & {
  scenario: LinkedAppScenario.AuthSucceeded
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: boolean
  throughLobby: true
  username: string

  fs?: FileSystem
}

export type AuthCancelled = LinkedAppBase & {
  scenario: LinkedAppScenario.AuthCancelled
  permissions: Maybe<Permissions>

  authenticated: false
  cancellationReason: string
  throughLobby: true
}

export type Continuation = LinkedAppBase & {
  scenario: LinkedAppScenario.Continuation
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: false
  throughLobby: false
  username: string

  fs?: FileSystem
}

export const isLinkedAppState = (state: State): state is LinkedAppState => {
  return state.kind === "linkedAppState"
}