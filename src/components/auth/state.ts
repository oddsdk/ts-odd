import FileSystem from "../../fs/index.js"


// SCENARIO


export enum Scenario {
  NotAuthed = "NOT_AUTHORIZED",
  Authed = "AUTHORIZED"
}

export function scenarioAuthed(
  username: string,
  fs: FileSystem | undefined,
  newUser?: boolean
): Authed {
  return {
    scenario: Scenario.Authed,

    authenticated: true,
    fs,
    newUser,
    username
  }
}

export function scenarioNotAuthed(): NotAuthed {
  return {
    scenario: Scenario.NotAuthed,

    authenticated: false
  }
}



// STATE


export type State
  = NotAuthed
  | Authed

export type NotAuthed = {
  scenario: Scenario.NotAuthed

  authenticated: false
}

export type Authed = {
  scenario: Scenario.Authed

  authenticated: true
  username: string

  fs?: FileSystem

  // Lobby specific params
  newUser?: boolean
}