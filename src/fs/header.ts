import { Header } from './types'
import semver from './semver'

export const empty = (): Header => ({
  name: '',
  version: semver.latest,
  key: null,
  cache: {},
  isFile: false,
  mtime: Date.now(),
  size: 0
})

export default {
  empty
}
