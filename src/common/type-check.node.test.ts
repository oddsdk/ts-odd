import { strict as assert } from "assert"
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
          assert.equal(check.isDefined(data), true)
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert.equal(check.isDefined(true), true)
  })

  it("returns true when passed false", () => {
    assert.equal(check.isDefined(false), true)
  })

  it("returns true when passed a null", () => {
    assert.equal(check.isDefined(null), true)
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
          assert.equal(check.notNull(data), true)
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert.equal(check.notNull(true), true)
  })

  it("returns true when passed false", () => {
    assert.equal(check.notNull(false), true)
  })

  it("returns true when passed undefined", () => {
    assert.equal(check.notNull(undefined), true)
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
          assert.equal(check.isJust(data), true)
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert.equal(check.isJust(true), true)
  })

  it("returns true when passed false", () => {
    assert.equal(check.isJust(false), true)
  })

  it("returns true when passed undefined", () => {
    assert.equal(check.isJust(undefined), true)
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
          assert.equal(check.isValue(data), true)
        }
      )
    )
  })

  it("returns true when passed true", () => {
    assert.equal(check.isValue(true), true)
  })

  it("returns true when passed false", () => {
    assert.equal(check.isValue(false), true)
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
    assert.equal(check.isBool(true), true)
  })

  it("returns true when passed false", () => {
    assert.equal(check.isBool(false), true)
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
          assert.equal(check.isNum(data), true)
        }
      )
    )
  })

  it("returns true when passed infinity", () => {
    assert.equal(check.isNum(Infinity), true)
  })

  it("returns true when passed negative infinity", () => {
    assert.equal(check.isNum(-Infinity), true)
  })

  it("returns true when passed a NaN", () => {
    assert.equal(check.isNum(NaN), true)
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
        assert.equal(check.isString(data), true)
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
        assert.equal(check.isObject(data), true)
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
