import { strict as assert } from "assert"
import { isUsernameValid } from "./index.js"

describe("isUsernameValid", () => {
  it("allows basic usernames", () => {
    assert.equal(isUsernameValid("simple"), true)
  })

  it("allows internal hyphens", () => {
    assert.equal(isUsernameValid("happy-name"), true)
  })

  it("allows numbers", () => {
    assert.equal(isUsernameValid("not-the-90s-anymore"), true)
  })

  it("allows internal underscores", () => {
    assert.equal(isUsernameValid("under_score"), true)
  })

  it("does not allow blocklisted words", () => {
    assert.equal(isUsernameValid("recovery"), false)
  })

  it("is not case sensitive", () => {
    assert.equal(isUsernameValid("reCovErY"), false)
  })

  it("does not allow empty strings", () => {
    assert.equal(isUsernameValid(""), false)
  })

  it("does not allow special characters", () => {
    assert.equal(isUsernameValid("plus+plus"), false)
  })

  it("does not allow prefixed hyphens", () => {
    assert.equal(isUsernameValid("-startswith"), false)
  })

  it("does not allow suffixed hyphens", () => {
    assert.equal(isUsernameValid("endswith-"), false)
  })

  it("does not allow prefixed underscores", () => {
    assert.equal(isUsernameValid("_startswith"), false)
  })

  it("does not allow spaces", () => {
    assert.equal(isUsernameValid("with space"), false)
  })

  it("does not allow dots", () => {
    assert.equal(isUsernameValid("with.dot"), false)
  })

  it("does not allow two dots", () => {
    assert.equal(isUsernameValid("has.two.dots"), false)
  })

  it("does not allow special characters", () => {
    assert.equal(isUsernameValid("name&with#chars"), false)
  })
})
