export * from './types'
export * from './config'
export * from './basic'
export * from './encoded'

import config from './config'
import basic from './basic'
import encoded from './encoded'

export default {
  ...config,
  ...basic,
  encoded
}
