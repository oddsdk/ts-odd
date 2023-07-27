import assert from "assert"
import * as fc from "fast-check"
import * as check from "./type-checks.js"

const IT_FC = "property tests"

describe("is defined", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.object(), weight: 10 },
          { arbitrary: fc.string(), weight: 5 },
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert(check.isDefined(data))
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert(check.isDefined(true))
  })

  it("returns true when passed false", () => {
    assert(check.isDefined(false))
  })

  it("returns true when passed a null", () => {
    assert(check.isDefined(null))
  })

  it("returns false when passed undefined", () => {
    assert.equal(check.isDefined(undefined), false)
  })
})

describe("not null", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.object(), weight: 10 },
          { arbitrary: fc.string(), weight: 5 },
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert(check.notNull(data))
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert(check.notNull(true))
  })

  it("returns true when passed false", () => {
    assert(check.notNull(false))
  })

  it("returns true when passed undefined", () => {
    assert(check.notNull(undefined))
  })

  it("returns false when passed a null", () => {
    assert.equal(check.notNull(null), false)
  })
})

describe("is just", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.object(), weight: 10 },
          { arbitrary: fc.string(), weight: 5 },
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert(check.isJust(data))
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert(check.isJust(true))
  })

  it("returns true when passed false", () => {
    assert(check.isJust(false))
  })

  it("returns true when passed undefined", () => {
    assert(check.isJust(undefined))
  })

  it("returns false when passed a null", () => {
    assert.equal(check.isJust(null), false)
  })
})

describe("is value", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.object(), weight: 10 },
          { arbitrary: fc.string(), weight: 5 },
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert(check.isValue(data))
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert(check.isValue(true))
  })

  it("returns true when passed false", () => {
    assert(check.isValue(false))
  })

  it("returns false when passed undefined", () => {
    assert.equal(check.isValue(undefined), false)
  })

  it("returns false when passed a null", () => {
    assert.equal(check.isValue(null), false)
  })
})

describe("is boolean", () => {
  it("returns true when passed true", () => {
    assert(check.isBool(true))
  })

  it("returns true when passed false", () => {
    assert(check.isBool(false))
  })

  it(IT_FC, () => {
    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.object(), weight: 10 },
          { arbitrary: fc.string(), weight: 5 },
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert.equal(check.isBool(data), false)
        }
      )
    )
  })

  it("returns false when passed a null", () => {
    assert.equal(check.isBool(null), false)
  })

  it("returns false when passed a undefined", () => {
    assert.equal(check.isBool(undefined), false)
  })
})

describe("is num", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.float(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert(check.isNum(data))
        }
      )
    )
  })

  it("returns true when passed infinity", () => {
    assert(check.isNum(Infinity))
  })

  it("returns true when passed negative infinity", () => {
    assert(check.isNum(-Infinity))
  })

  it("returns true when passed a NaN", () => {
    assert(check.isNum(NaN))
  })

  it(IT_FC, () => {
    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.object(), weight: 10 },
          { arbitrary: fc.string(), weight: 5 }
        ),
        data => {
          assert.equal(check.isNum(data), false)
        }
      )
    )
  })

  it("returns false when passed true", () => {
    assert.equal(check.isNum(true), false)
  })

  it("returns false when passed false", () => {
    assert.equal(check.isNum(false), false)
  })

  it("returns false when passed undefined", () => {
    assert.equal(check.isNum(undefined), false)
  })

  it("returns false when passed null", () => {
    assert.equal(check.isNum(null), false)
  })
})

describe("is string", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.string(), data => {
        assert(check.isString(data))
      })
    )

    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.object(), weight: 10 },
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert.equal(check.isString(data), false)
        }
      )
    )
  })

  it("returns false when passed true", () => {
    assert.equal(check.isString(true), false)
  })

  it("returns false when passed false", () => {
    assert.equal(check.isString(false), false)
  })

  it("returns false when passed undefined ", () => {
    assert.equal(check.isString(undefined), false)
  })

  it("returns false when passed null", () => {
    assert.equal(check.isString(null), false)
  })
})

describe("is object", () => {
  it(IT_FC, () => {
    fc.assert(
      fc.property(fc.object(), data => {
        assert(check.isObject(data))
      })
    )

    fc.assert(
      fc.property(
        fc.oneof(
          { arbitrary: fc.string(), weight: 5 },
          { arbitrary: fc.integer(), weight: 1 },
          { arbitrary: fc.double(), weight: 1 }
        ),
        data => {
          assert.equal(check.isObject(data), false)
        }
      )
    )
  })

  it("returns false when passed true", () => {
    assert.equal(check.isObject(true), false)
  })

  it("returns false when passed false", () => {
    assert.equal(check.isObject(false), false)
  })

  it("returns false when passed undefined ", () => {
    assert.equal(check.isObject(undefined), false)
  })

  it("returns false when passed null", () => {
    assert.equal(check.isObject(null), false)
  })
})
