import * as Path from "../path/index.js"

import { Cabinet } from "../repositories/cabinet.js"
import { Capability, Facts, Ucan } from "./types.js"

export class Dictionary {
  #cabinet: Cabinet

  constructor(
    cabinet: Cabinet
  ) {
    this.#cabinet = cabinet
  }

  /////////////
  // LOOKUPS //
  /////////////

  descendUntilMatching(
    ucan: Ucan,
    matcher: (ucan: Ucan) => boolean
  ): Ucan | null {
    if (matcher(ucan)) return ucan
    return ucan.payload.prf.reduce(
      (acc: Ucan | null, prfCID) => {
        if (acc) return acc
        const prf = this.lookupByCID(prfCID)
        return prf && matcher(prf) ? prf : null
      },
      null
    )
  }

  findMatching(matcher: (ucan: Ucan) => boolean): Ucan | null {
    return this.#cabinet.ucans.reduce(
      (acc: Ucan | null, ucan) => {
        if (acc) return acc
        if (matcher(ucan)) return ucan
        return this.descendUntilMatching(ucan, matcher)
      },
      null
    )
  }

  listCapabilities(ucan: Ucan): Capability[] {
    const caps = ucan.payload.att
    const proofs = ucan.payload.prf.map(cid => this.#cabinet.ucansIndexedByCID[cid])

    return proofs.reduce(
      (acc: Capability[], maybeUcan): Capability[] => {
        if (maybeUcan) return [...acc, ...this.listCapabilities(maybeUcan)]
        return acc
      },
      caps
    )
  }

  listFacts(ucan: Ucan): Facts {
    const facts = (ucan.payload.fct || []).reduce((acc, f) => {
      return { ...acc, ...f }
    }, {})

    const proofs = ucan.payload.prf.map(cid => this.#cabinet.ucansIndexedByCID[cid])

    return proofs.reduce(
      (acc: Facts, maybeUcan): Facts => {
        if (maybeUcan) return { ...acc, ...this.listFacts(maybeUcan) }
        return acc
      },
      facts
    )
  }

  lookupByAudience(audience: string): Ucan[] {
    return (this.#cabinet.ucansIndexedByAudience[audience] || []).slice(0)
  }

  lookupByCID(cid: string): Ucan | null {
    return this.#cabinet.ucansIndexedByCID[cid] || null
  }

  lookupFileSystemUcan(
    fileSystemDID: string,
    path: Path.DistinctivePath<Path.Segments>
  ): Ucan | null {
    const fsUcans = this.lookupFileSystemUcans()

    return this.#lookupFileSystemUcan(
      this.lookupFileSystemUcans(),
      pathSoFar => ucan => {
        const hierPart = `//${fileSystemDID}/${Path.toPosix(pathSoFar)}`

        return !!ucan.payload.att.find(cap => {
          return cap.with.hierPart === hierPart && (cap.can === "*" || cap.can.namespace === "fs")
        })
      },
      path
    )
  }

  lookupFileSystemUcans(): Ucan[] {
    return this.#cabinet.ucans.filter(ucan => ucan.payload.att.some(cap => cap.with.scheme === "wnfs"))
  }

  #lookupFileSystemUcan(
    fsUcans: Ucan[],
    matcher: (pathSoFar: Path.Distinctive<Path.Segments>) => (ucan: Ucan) => boolean,
    path: Path.DistinctivePath<Path.Segments>
  ): Ucan | null {
    const pathParts = Path.unwrap(path)

    const results = ["", ...pathParts].reduce(
      (acc: Ucan[], _part, idx): Ucan[] => {
        const pathSoFar = Path.fromKind(Path.kind(path), ...(pathParts.slice(0, idx)))

        return [
          ...acc,
          ...fsUcans.filter(
            matcher(pathSoFar)
          ),
        ]
      },
      []
    )

    // TODO: Need to sort by ability level, ie. prefer super user over anything else
    return results[0] || null
  }

  rootIssuer(ucan: Ucan): string {
    if (ucan.payload.prf.length) {
      return ucan.payload.prf.reduce(
        (acc, prf) => {
          // Always prefer the first proof.
          // TBH, not sure what's best here.
          if (acc) return acc

          const prfUcan = this.#cabinet.ucansIndexedByCID[prf]
          if (!prfUcan) throw new Error("Missing a UCAN in the repository")

          return this.rootIssuer(prfUcan)
        }
      )
    } else {
      return ucan.payload.iss
    }
  }
}
