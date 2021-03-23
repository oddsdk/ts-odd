import * as check from './type-checks'

describe('is defined', () => {
  it('returns true when passed a value', () => {
    expect(check.isDefined(1)).toBe(true)
  })

  it('returns true when passed a null', () => {
    expect(check.isDefined(null)).toBe(true)
  })

  it('returns false when passed undefined', () => {
    expect(check.isDefined(undefined)).toBe(false)
  })
})


describe('not null', () => {
  it('returns true when passed a value', () => {
    expect(check.notNull(1)).toBe(true)
  })

  it('returns true when passed undefined', () => {
    expect(check.notNull(undefined)).toBe(true)
  })

  it('returns false when passed a null', () => {
    expect(check.notNull(null)).toBe(false)
  })
})

describe('is just', () => {
  it('returns true when passed a value', () => {
    expect(check.isJust(1)).toBe(true)
  })

  it('returns true when passed undefined', () => {
    expect(check.isJust(undefined)).toBe(true)
  })

  it('returns false when passed a null', () => {
    expect(check.isJust(null)).toBe(false)
  })
})

describe('is value', () => {
  it('returns true when passed a value', () => {
    expect(check.isValue(1)).toBe(true)
  })

  it('returns false when passed undefined', () => {
    expect(check.isValue(undefined)).toBe(false)
  })

  it('returns false when passed a null', () => {
    expect(check.isValue(null)).toBe(false)
  })
})

describe('is boolean', () => {
  it('returns true when passed true', () => {
    expect(check.isBool(true)).toBe(true)
  })

  it('returns true when passed false', () => {
    expect(check.isBool(false)).toBe(true)
  })

  it('returns false when passed a non-boolean value', () => {
    expect(check.isBool(1)).toBe(false)
  })

  it('returns false when passed a null', () => {
    expect(check.isBool(null)).toBe(false)
  })

  it('returns false when passed a undefined', () => {
    expect(check.isBool(undefined)).toBe(false)
  })
})

describe('is num', () => {
  it('returns true when passed a number', () => {
    expect(check.isNum(1)).toBe(true)
  })

  it('returns true when passed a hex number', () => {
    expect(check.isNum(0x1)).toBe(true)
  })

  it('returns true when passed a binary number', () => {
    expect(check.isNum(0b1)).toBe(true)
  })

  it('returns true when passed a octal number', () => {
    expect(check.isNum(0o1)).toBe(true)
  })

  it('returns true when passed infinity', () => {
    expect(check.isNum(Infinity)).toBe(true)
  })

  it('returns true when passed negative infinity', () => {
    expect(check.isNum(-Infinity)).toBe(true)
  })

  it('returns false when passed a non-numeric value', () => {
    expect(check.isNum('1')).toBe(false)
  })

  it('returns false when passed undefined', () => {
    expect(check.isNum(undefined)).toBe(false)
  })

  it('returns false when passed null', () => {
    expect(check.isNum(null)).toBe(false)
  })
})

describe('is string', () => {
  it('returns true when passed a string', () => {
    expect(check.isString('a')).toBe(true)
  })

  it('returns true when passed an empty string', () => {
    expect(check.isString('')).toBe(true)
  })

  it('returns false when passed an non-string value', () => {
    expect(check.isString(1)).toBe(false)
  })

  it('returns false when passed undefined ', () => {
    expect(check.isString(undefined)).toBe(false)
  })

  it('returns false when passed null', () => {
    expect(check.isString(null)).toBe(false)
  })
})

describe('is object', () => {
  it('returns true when passed a object', () => {
    expect(check.isObject({ a: 1 })).toBe(true)
  })

  it('returns true when passed an empty object', () => {
    expect(check.isObject({})).toBe(true)
  })

  it('returns false when passed an non-object value', () => {
    expect(check.isObject(1)).toBe(false)
  })

  it('returns false when passed undefined ', () => {
    expect(check.isObject(undefined)).toBe(false)
  })

  it('returns false when passed null', () => {
    expect(check.isObject(null)).toBe(false)
  })
})