import expect from "expect"
import { decodeCID } from "./cid.js"


describe("CIDs", () => {

  it("decodes DAG-JSON cids", () => {
    const CID_STRING = "bafkreicu646jao2xjpkbmk3buom6hmxsexmbwyju22k6wmtnky2ljisv3e"
    const cidInstance = decodeCID({ "/": CID_STRING })

    expect(cidInstance.toString()).toEqual(CID_STRING)
  })

})