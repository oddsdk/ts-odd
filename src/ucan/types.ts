export type SessionKey = {
  sessionKey: string
}

export type Fact = SessionKey | Record<string, string>

export type Resource =
  "*" | Record<string, string>

export type Potency = string |  Record<string, unknown> | undefined | null

export type UcanHeader = {
  alg: string
  typ: string
  uav: string
}

export type UcanPayload = {
  aud: string
  exp: number
  fct: Array<Fact>
  iss: string
  nbf: number
  prf: string | null
  ptc: Potency
  rsc: Resource
}

export type Ucan = {
  header: UcanHeader
  payload: UcanPayload
  signature: string | null
}

