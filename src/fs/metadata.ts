import * as semver from './semver'
import { SemVer } from './semver'

export type Metadata = {
  isFile: boolean
  mtime: number
  ctime: number
  version: SemVer
}

export const empty = (): Metadata => ({
  isFile: false,
  mtime: Date.now(),
  ctime: Date.now(),
  version: semver.latest
})
