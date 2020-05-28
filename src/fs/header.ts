import { Header } from './types'
import semver from './semver'

export const empty = (): Header => ({
  version: semver.latest,
  key: null,
  pins: {},
  cache: {},
  isFile: false,
  mtime: Date.now()
})

export default {
  empty
}
