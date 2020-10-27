import test from "ava"
import ctx from "./helpers/withWebnative"


test("building a valid UCAN", ctx, async (t, page) => {
  const isValid = await page.evaluate(async () => {
    const ucan = await webnative.ucan.build({
      audience: await randomRsaDid(),
      issuer: await webnative.did.ucan()
    })

    return webnative.ucan.isValid(ucan)
  })

  t.true(isValid)
})


test("validating a UCAN with a valid proof", ctx, async (t, page) => {
  const isValid = await page.evaluate(async () => {
    const storeA = webnative.keystore.create()
    const storeB = webnative.keystore.create()

    await webnative.keystore.set(storeB)
    const issB = await webnative.did.ucan()

    // Proof
    await webnative.keystore.set(storeA)
    const issA = await webnative.did.ucan()
    const prf = await webnative.ucan.build({
      audience: issB,
      issuer: issA
    })

    // Shell
    await webnative.keystore.set(storeB)
    const ucan = await webnative.ucan.build({
      audience: await randomRsaDid(),
      issuer: issB,
      proofs: [ prf ]
    })

    // Validate
    return webnative.ucan.isValid(ucan)
  })

  t.true(isValid)
})


test("not validating a UCAN with a faulty proof (wrong audience)", ctx, async (t, page) => {
  const isValid = await page.evaluate(async () => {
    const storeA = webnative.keystore.create()
    const storeB = webnative.keystore.create()

    await webnative.keystore.set(storeB)
    const issB = await webnative.did.ucan()

    // Proof
    await webnative.keystore.set(storeA)
    const issA = await webnative.did.ucan()
    const prf = await webnative.ucan.build({
      audience: "wrong_audience", // ← wrong value
      issuer: issA
    })

    // Shell
    await webnative.keystore.set(storeB)
    const ucan = await webnative.ucan.build({
      audience: await randomRsaDid(),
      issuer: issB,
      proofs: [ prf ]
    })

    // Validate
    return webnative.ucan.isValid(ucan)
  })

  t.false(isValid)
})


test("not validating a UCAN with a faulty proof (invalid signature, proof)", ctx, async (t, page) => {
  const isValid = await page.evaluate(async () => {
    const storeA = webnative.keystore.create()
    const storeB = webnative.keystore.create()

    await webnative.keystore.set(storeB)
    const issB = await webnative.did.ucan()

    // Proof
    await webnative.keystore.set(storeA)
    const issA = await webnative.did.ucan()
    const prf = await webnative.ucan.build({
      addSignature: false,
      audience: issB,
      issuer: issA
    })

    prf.signature = "NOPE" // ← wrong value

    // Shell
    await webnative.keystore.set(storeB)
    const ucan = await webnative.ucan.build({
      audience: await randomRsaDid(),
      issuer: issB,
      proofs: [ prf ]
    })

    // Validate
    return webnative.ucan.isValid(ucan)
  })

  t.false(isValid)
})


test("not validating a UCAN with a faulty proof (invalid signature, shell)", ctx, async (t, page) => {
  const isValid = await page.evaluate(async () => {
    const storeA = webnative.keystore.create()
    const storeB = webnative.keystore.create()

    await webnative.keystore.set(storeB)
    const issB = await webnative.did.ucan()

    // Proof
    await webnative.keystore.set(storeA)
    const issA = await webnative.did.ucan()
    const prf = await webnative.ucan.build({
      audience: issB,
      issuer: issA
    })

    // Shell
    await webnative.keystore.set(storeB)
    const ucan = await webnative.ucan.build({
      addSignature: false,
      audience: await randomRsaDid(),
      issuer: issB,
      proofs: [ prf ]
    })

    ucan.signature = "NOPE" // ← wrong value

    // Validate
    return webnative.ucan.isValid(ucan)
  })

  t.false(isValid)
})
