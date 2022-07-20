import FileSystem from "../../fs/index.js"


// SCENARIO


export enum AppScenario {
  NotAuthed = "NOT_AUTHORIZED",
  Authed = "AUTHORIZED"
}

export function scenarioAuthed(
  username: string,
  fs: FileSystem | undefined
): Authed {
  return {
    kind: "appState",
    scenario: AppScenario.Authed,

    authenticated: true,
    fs,
    username
  }
}

export function scenarioNotAuthed(): NotAuthed {
  return {
    kind: "appState",
    scenario: AppScenario.NotAuthed,

    authenticated: false
  }
}



// STATE


export type AppState
  = NotAuthed
  | Authed

type AppBase = {
  kind: "appState"
}

export type NotAuthed = AppBase & {
  scenario: AppScenario.NotAuthed

  authenticated: false
}

export type Authed = AppBase & {
  scenario: AppScenario.Authed

  authenticated: true
  username: string

  fs?: FileSystem
}