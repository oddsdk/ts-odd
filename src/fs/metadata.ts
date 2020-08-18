import { Metadata } from './types'
import * as semver from './semver'

export const empty = (): Metadata => ({
  isFile: false,
  mtime: Date.now(),
  ctime: Date.now(),
  version: semver.latest
})
