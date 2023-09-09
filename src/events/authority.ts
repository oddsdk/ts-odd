import { Query } from "../authority/query.js"

export type Authority = {
  "provide:authorised": { queries: Query[] }
  "provide:authorized": { queries: Query[] }
  "provide:dismissed": undefined
  "provide:query": {
    approve: (queries: Query[]) => void
    dismiss: () => void
    queries: Query[]
  }

  "request:authorised": { queries: Query[] }
  "request:authorized": { queries: Query[] }
  "request:dismissed": undefined
}
