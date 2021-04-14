import { expectError } from 'tsd'
import * as permissions from './permissions'

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
