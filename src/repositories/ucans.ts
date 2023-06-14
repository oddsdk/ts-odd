import * as Storage from "../components/storage/implementation"
import * as Ucan from "../ucan/index.js"

import Repository, { RepositoryOptions } from "../repository.js"
import { CID, Maybe, isString } from "../common/index.js"


export function create({ storage }: { storage: Storage.Implementation }): Promise<Repo> {
  return Repo.create({
    storage,
    storageName: storage.KEYS.UCANS
  })
}



// CLASS


export class Repo extends Repository<Ucan.Dictionary, Ucan.Ucan> {

  private indexedByAudience: Record<string, Ucan.Ucan[]>


  private constructor(options: RepositoryOptions) {
    super(options)
    this.indexedByAudience = {}
  }


  // IMPLEMENTATION

  emptyCollection() {
    return {}
  }

  mergeCollections(a: Ucan.Dictionary, b: Ucan.Dictionary): Ucan.Dictionary {
    return {
      ...a,
      ...b
    }
  }

  async toCollection(item: Ucan.Ucan): Promise<Ucan.Dictionary> {
    return { [ (await Ucan.cid(item)).toString() ]: item }
  }

  collectionUpdateCallback(collection: Ucan.Dictionary) {
    this.indexedByAudience = Object.entries(collection).reduce(
      (acc: Record<string, Ucan.Ucan[]>, [ k, v ]) => {
        return {
          ...acc,
          [ v.payload.aud ]: [ ...(acc[ v.payload.aud ] || []), v ]
        }
      },
      {}
    )
  }


  // ENCODING

  fromJSON(a: string): Ucan.Dictionary {
    const encodedObj = JSON.parse(a)

    return Object.entries(encodedObj).reduce(
      (acc, [ k, v ]) => {
        return {
          ...acc,
          [ k ]: Ucan.decode(v as string)
        }
      },
      {}
    )
  }

  toJSON(a: Ucan.Dictionary): string {
    const encodedObj = Object.entries(a).reduce(
      (acc, [ k, v ]) => {
        return {
          ...acc,
          [ k ]: Ucan.encode(v)
        }
      },
      {}
    )

    return JSON.stringify(encodedObj)
  }


  // LOOKUPS

  getByCID(cid: CID | string): Maybe<Ucan.Ucan> {
    const cidString = isString(cid) ? cid : cid.toString()
    return this.collection[ cidString ]
  }

  audienceUcans(audience: string): Ucan.Ucan[] {
    return this.indexedByAudience[ audience ] || []
  }

}
