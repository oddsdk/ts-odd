import * as fc from "fast-check"
import * as check from "./type-checks.js"
import expect from "expect"


const IT_FC = "property tests"


describe("is defined", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.object(), weight: 10 },
        { arbitrary: fc.string(), weight: 5 },
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.isDefined(data)).toEqual(true)
      })
    )
  })

  it("returns true when passed true", () => {
    expect(check.isDefined(true)).toBe(true)
  })

  it("returns true when passed false", () => {
    expect(check.isDefined(false)).toBe(true)
  })

  it("returns true when passed a null", () => {
    expect(check.isDefined(null)).toBe(true)
  })

  it("returns false when passed undefined", () => {
    expect(check.isDefined(undefined)).toBe(false)
  })
})


describe("not null", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.object(), weight: 10 },
        { arbitrary: fc.string(), weight: 5 },
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.notNull(data)).toEqual(true)
      })
    )
  })

  it("returns true when passed true", () => {
    expect(check.notNull(true)).toBe(true)
  })

  it("returns true when passed false", () => {
    expect(check.notNull(false)).toBe(true)
  })

  it("returns true when passed undefined", () => {
    expect(check.notNull(undefined)).toBe(true)
  })

  it("returns false when passed a null", () => {
    expect(check.notNull(null)).toBe(false)
  })
})

describe("is just", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.object(), weight: 10 },
        { arbitrary: fc.string(), weight: 5 },
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.isJust(data)).toEqual(true)
      })
    )
  })

  it("returns true when passed true", () => {
    expect(check.isJust(true)).toBe(true)
  })

  it("returns true when passed false", () => {
    expect(check.isJust(false)).toBe(true)
  })

  it("returns true when passed undefined", () => {
    expect(check.isJust(undefined)).toBe(true)
  })

  it("returns false when passed a null", () => {
    expect(check.isJust(null)).toBe(false)
  })
})

describe("is value", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.object(), weight: 10 },
        { arbitrary: fc.string(), weight: 5 },
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.isValue(data)).toEqual(true)
      })
    )
  })

  it("returns true when passed true", () => {
    expect(check.isValue(true)).toBe(true)
  })

  it("returns true when passed false", () => {
    expect(check.isValue(false)).toBe(true)
  })

  it("returns false when passed undefined", () => {
    expect(check.isValue(undefined)).toBe(false)
  })

  it("returns false when passed a null", () => {
    expect(check.isValue(null)).toBe(false)
  })
})

describe("is boolean", () => {
  it("returns true when passed true", () => {
    expect(check.isBool(true)).toBe(true)
  })

  it("returns true when passed false", () => {
    expect(check.isBool(false)).toBe(true)
  })

  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.object(), weight: 10 },
        { arbitrary: fc.string(), weight: 5 },
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.isBool(data)).toEqual(false)
      })
    )
  })

  it("returns false when passed a null", () => {
    expect(check.isBool(null)).toBe(false)
  })

  it("returns false when passed a undefined", () => {
    expect(check.isBool(undefined)).toBe(false)
  })
})

describe("is num", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.float(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.isNum(data)).toEqual(true)
      })
    )
  })

  it("returns true when passed infinity", () => {
    expect(check.isNum(Infinity)).toBe(true)
  })

  it("returns true when passed negative infinity", () => {
    expect(check.isNum(-Infinity)).toBe(true)
  })

  it("returns true when passed a NaN", () => {
    expect(check.isNum(NaN)).toBe(true)
  })

  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.object(), weight: 10 },
        { arbitrary: fc.string(), weight: 5 },
      ), data => {
        expect(check.isNum(data)).toEqual(false)
      })
    )
  })

  it("returns false when passed true", () => {
    expect(check.isNum(true)).toBe(false)
  })

  it("returns false when passed false", () => {
    expect(check.isNum(false)).toBe(false)
  })

  it("returns false when passed undefined", () => {
    expect(check.isNum(undefined)).toBe(false)
  })

  it("returns false when passed null", () => {
    expect(check.isNum(null)).toBe(false)
  })
})


describe("is string", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.string(), data => {
        expect(check.isString(data)).toEqual(true)
      })
    )

    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.object(), weight: 10 },
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.isString(data)).toEqual(false)
      })
    )
  })

  it("returns false when passed true", () => {
    expect(check.isString(true)).toBe(false)
  })

  it("returns false when passed false", () => {
    expect(check.isString(false)).toBe(false)
  })

  it("returns false when passed undefined ", () => {
    expect(check.isString(undefined)).toBe(false)
  })

  it("returns false when passed null", () => {
    expect(check.isString(null)).toBe(false)
  })
})

describe("is object", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.object(), data => {
        expect(check.isObject(data)).toEqual(true)
      })
    )

    fc.assert(
      fc.property(fc.oneof(
        { arbitrary: fc.string(), weight: 5 },
        { arbitrary: fc.integer(), weight: 1 },
        { arbitrary: fc.double(), weight: 1 }
      ), data => {
        expect(check.isObject(data)).toEqual(false)
      })
    )
  })

  it("returns false when passed true", () => {
    expect(check.isObject(true)).toBe(false)
  })

  it("returns false when passed false", () => {
    expect(check.isObject(false)).toBe(false)
  })

  it("returns false when passed undefined ", () => {
    expect(check.isObject(undefined)).toBe(false)
  })

  it("returns false when passed null", () => {
    expect(check.isObject(null)).toBe(false)
  })
})