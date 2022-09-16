import expect from "expect"
import { isUsernameValid } from "./username.js"

describe("isUsernameValid", () => {

  it("allows basic usernames", async () => {
    expect(await isUsernameValid("simple")).toBe(true)
  })

  it("allows internal hyphens", async () => {
    expect(await isUsernameValid("happy-name")).toBe(true)
  })

  it("allows numbers", async () => {
    expect(await isUsernameValid("not-the-90s-anymore")).toBe(true)
  })

  it("allows internal underscores", async () => {
    expect(await isUsernameValid("under_score")).toBe(true)
  })

  it("does not allow blocklisted words", async () => {
    expect(await isUsernameValid("recovery")).toBe(false)
  })

  it("is not case sensitive", async () => {
    expect(await isUsernameValid("reCovErY")).toBe(false)
  })

  it("does not allow empty strings", async () => {
    expect(await isUsernameValid("")).toBe(false)
  })

  it("does not allow special characters", async () => {
    expect(await isUsernameValid("plus+plus")).toBe(false)
  })

  it("does not allow prefixed hyphens", async () => {
    expect(await isUsernameValid("-startswith")).toBe(false)
  })

  it("does not allow suffixed hyphens", async () => {
    expect(await isUsernameValid("endswith-")).toBe(false)
  })

  it("does not allow prefixed underscores", async () => {
    expect(await isUsernameValid("_startswith")).toBe(false)
  })

  it("does not allow spaces", async () => {
    expect(await isUsernameValid("with space")).toBe(false)
  })

  it("does not allow dots", async () => {
    expect(await isUsernameValid("with.dot")).toBe(false)
  })

  it("does not allow two dots", async () => {
    expect(await isUsernameValid("has.two.dots")).toBe(false)
  })

  it("does not allow special characters", async () => {
    expect(await isUsernameValid("name&with#chars")).toBe(false)
  })

})
