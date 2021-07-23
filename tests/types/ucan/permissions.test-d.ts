import { expectError } from 'tsd'
import * as permissions from './permissions.js'

expectError(() => {
  permissions.paths({
    fs: { privatePaths: [] }
  })
})

// Should work
permissions.paths({
  fs: {
    private: { directories: [], files: [] }
  }
})
