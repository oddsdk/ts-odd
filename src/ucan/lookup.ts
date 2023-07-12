import * as Path from "../path/index.js"
import { Dictionary, Ucan } from "./types.js"

// 🛠️

export function fsReadUcans(collection: Ucan[], did: string): Ucan[] {
  return collection.filter(ucan =>
    (ucan.payload.fct || []).some(f => {
      return Object.keys(f).some(a => a.startsWith(`wnfs://${did}/`))
    })
  )
}

export function fsWriteUcans(collection: Ucan[]): Ucan[] {
  return collection.filter(ucan => ucan.payload.att.some(cap => cap.with.scheme === "wnfs"))
}

export function lookupFsReadUcan(
  collection: Ucan[],
  fileSystemDID: string,
  path: Path.DistinctivePath<Path.Segments>,
  did: string,
): Ucan | null {
  return lookupFsUcan(
    fsReadUcans(collection, did),
    pathSoFar => ucan => {
      return (ucan.payload.fct || []).some(f => {
        return Object.keys(f).some(a => {
          const withoutScheme = a.replace("wnfs://", "")
          return withoutScheme === `${fileSystemDID}/${Path.toPosix(pathSoFar)}`
        })
      })
    },
    fileSystemDID,
    path,
  )
}

export function lookupFsWriteUcan(
  collection: Ucan[],
  fileSystemDID: string,
  path: Path.DistinctivePath<Path.Segments>,
): Ucan | null {
  return lookupFsUcan(
    fsWriteUcans(collection),
    pathSoFar => ucan => {
      const hierPart = `//${fileSystemDID}/${Path.toPosix(pathSoFar)}`

      return !!ucan.payload.att.find(cap => {
        return cap.with.hierPart === hierPart && (cap.can === "*" || cap.can.namespace === "fs")
      })
    },
    fileSystemDID,
    path,
  )
}

export function rootIssuer(ucan: Ucan, ucanDictionary: Dictionary): string {
  if (ucan.payload.prf.length) {
    return ucan.payload.prf.reduce(
      (acc, prf) => {
        // Always prefer the first proof.
        // TBH, not sure what's best here.
        if (acc) return acc

        const prfUcan = ucanDictionary[prf]
        if (!prfUcan) throw new Error("Missing a UCAN in the repository")

        return rootIssuer(prfUcan, ucanDictionary)
      },
    )
  } else {
    return ucan.payload.iss
  }
}

// ㊙️

function lookupFsUcan(
  fsUcans: Ucan[],
  matcher: (pathSoFar: Path.Distinctive<Path.Segments>) => (ucan: Ucan) => boolean,
  fileSystemDID: string,
  path: Path.DistinctivePath<Path.Segments>,
): Ucan | null {
  const pathParts = Path.unwrap(path)

  const results = ["", ...pathParts].reduce(
    (acc: Ucan[], _part, idx): Ucan[] => {
      const pathSoFar = Path.fromKind(Path.kind(path), ...(pathParts.slice(0, idx)))

      return [
        ...acc,
        ...fsUcans.filter(
          matcher(pathSoFar),
        ),
      ]
    },
    [],
  )

  // TODO: Need to sort by ability level, ie. prefer super user over anything else
  return results[0] || null
}
