import * as SemVer from "../common/semver.js"


export * from "../common/semver.js"



export const isSupported = (fsVersion: SemVer.SemVer): true | "too-high" | "too-low" => {
  if (SemVer.isSmallerThan(fsVersion, latest)) {
    return "too-low"
  } else if (SemVer.isBiggerThan(fsVersion, wnfsWasm)) {
    return "too-high"
  } else {
    return true
  }
}


// VERSIONS
export const v0 = SemVer.encode(0, 0, 0)
export const v1 = SemVer.encode(1, 0, 0)
export const latest = SemVer.encode(2, 0, 0)
export const wnfsWasm = SemVer.encode(3, 0, 0)

export const supported: SemVer.SemVer[] = [ latest, wnfsWasm ]
