export * from './config'
export * from './basic'

import config from './config'
import basic from './basic'

export default {
  ...config,
  ...basic
}
