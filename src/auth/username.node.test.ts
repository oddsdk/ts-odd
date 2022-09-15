import expect from "expect"

import * as fc from "fast-check"
import * as setup from "../setup.js"
import { BASE_IMPLEMENTATION } from "./implementation/base.js"
import { toGlobalUsername } from "./username.js"


const safeCharacters = [ ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY0123456789" ]

describe("toGlobalUsername", async () => {
  it("passes safe usernames through without alteration", async () => {
    setIdentity()

    await fc.assert(
      fc.asyncProperty(fc.stringOf(fc.constantFrom(...safeCharacters), { minLength: 1, maxLength: 32 }), async username => {
        const globalUserame = await toGlobalUsername(username)
        expect(username).toEqual(globalUserame)
      })
    )
  })

  it("hashes usernames", async () => {
    setHashed()

    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 32 }), async username => {
        const globalUserame = await toGlobalUsername(username)
        expect(username).not.toEqual(globalUserame)
      })
    )
  })

  it("hashes unicode usernames", async () => {
    setHashed()

    await fc.assert(
      fc.asyncProperty(fc.fullUnicodeString({ minLength: 1, maxLength: 32 }), async username => {
        // `username` contains characters between 0x0000 (included) and 0x10ffff (included) 
        // but excludes surrogate pairs (between 0xd800 and 0xdfff). It might contain Unicode
        // code point escapes like \u{1f434} (which has a length of two).
        const globalUserame = await toGlobalUsername(username)

        // Decomposing username might produce surrogate pairs which should be re-composed
        // by `toGlobalUsername`
        const decomposedUsername = username.normalize("NFD")
        const decomposedGlobalUsername = await toGlobalUsername(decomposedUsername)

        expect(decomposedGlobalUsername).toEqual(globalUserame)
      })
    )
  })

  it("hashes usernames with username schemes", async () => {
    setHashedWithUsernameScheme()

    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 32 }), async username => {
        const globalUserame = await toGlobalUsername(username)
        expect(username).not.toEqual(globalUserame)
      })
    )
  })

  it("fails with username schemes that must be hashed", async () => {
    setUsernameScheme()

    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 32 }), async username => {
        await expect(toGlobalUsername(username))
        .rejects
        .toThrow()
      })
    )
  })
})


// Implementations

const setIdentity = () => {
  setup.setImplementations({
    auth: {
      ...BASE_IMPLEMENTATION.auth,
      transformUsername: (username: string): { username: string; hash: boolean } => {
        return { username, hash: false }
      }
    }
  })
}

const setHashed = () => {
  setup.setImplementations({
    auth: {
      ...BASE_IMPLEMENTATION.auth,
      transformUsername: (username: string): { username: string; hash: boolean } => {
        return { username, hash: true }
      }
    }
  })
}

const setUsernameScheme = () => {
  setup.setImplementations({
    auth: {
      ...BASE_IMPLEMENTATION.auth,
      transformUsername: (username: string): { username: string; hash: boolean } => {
        // Needs to be hashed, implementation should cause failures
        return {
          username: `${username}@fission.codes`,
          hash: false
        }
      }
    }
  })
}

const setHashedWithUsernameScheme = () => {
  setup.setImplementations({
    auth: {
      ...BASE_IMPLEMENTATION.auth,
      transformUsername: (username: string): { username: string; hash: boolean } => {
        return {
          username: `${username}@fission.codes`,
          hash: true
        }
      }
    }
  })
}