import expect from "expect"
import { isUsernameValid } from "./index.js"


describe("isUsernameValid", () => {

  it("allows basic usernames", () => {
    expect(isUsernameValid("simple")).toBe(true)
  })

  it("allows internal hyphens", () => {
    expect(isUsernameValid("happy-name")).toBe(true)
  })

  it("allows numbers", () => {
    expect(isUsernameValid("not-the-90s-anymore")).toBe(true)
  })

  it("allows internal underscores", () => {
    expect(isUsernameValid("under_score")).toBe(true)
  })

  it("does not allow blocklisted words", () => {
    expect(isUsernameValid("recovery")).toBe(false)
  })

  it("is not case sensitive", () => {
    expect(isUsernameValid("reCovErY")).toBe(false)
  })

  it("does not allow empty strings", () => {
    expect(isUsernameValid("")).toBe(false)
  })

  it("does not allow special characters", () => {
    expect(isUsernameValid("plus+plus")).toBe(false)
  })

  it("does not allow prefixed hyphens", () => {
    expect(isUsernameValid("-startswith")).toBe(false)
  })

  it("does not allow suffixed hyphens", () => {
    expect(isUsernameValid("endswith-")).toBe(false)
  })

  it("does not allow prefixed underscores", () => {
    expect(isUsernameValid("_startswith")).toBe(false)
  })

  it("does not allow spaces", () => {
    expect(isUsernameValid("with space")).toBe(false)
  })

  it("does not allow dots", () => {
    expect(isUsernameValid("with.dot")).toBe(false)
  })

  it("does not allow two dots", () => {
    expect(isUsernameValid("has.two.dots")).toBe(false)
  })

  it("does not allow special characters", () => {
    expect(isUsernameValid("name&with#chars")).toBe(false)
  })

})
