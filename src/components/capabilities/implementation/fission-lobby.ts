import * as Uint8arrays from "uint8arrays"

import * as Base64 from "../../../common/base64.js"
import * as Capabilities from "../../../capabilities.js"
import * as Crypto from "../../../components/crypto/implementation.js"
import * as Depot from "../../../components/depot/implementation.js"
import * as DID from "../../../did/index.js"
import * as Fission from "../../../common/fission.js"
import * as Path from "../../../path/index.js"
import * as TypeChecks from "../../../common/type-checks.js"
import * as Ucan from "../../../ucan/index.js"

import { Implementation, RequestOptions } from "../implementation.js"
import { Maybe } from "../../../common/types.js"
import { VERSION } from "../../../common/version.js"
import { decodeCID } from "../../../common/cid.js"


// 🧩


export type Dependents = {
  crypto: Crypto.Implementation
  depot: Depot.Implementation
}



// 🛠


export async function collect(
  endpoints: Fission.Endpoints,
  dependents: Dependents
): Promise<Maybe<Capabilities.Capabilities>> {
  const url = new URL(window.location.href)
  const authorised = url.searchParams.get("authorised")
  if (!authorised) return null

  const username = url.searchParams.get("username") ?? ""
  const secrets = await retry(
    async () => translateClassifiedInfo(
      dependents,
      authorised === "via-postmessage"
        ? await getClassifiedViaPostMessage(endpoints, dependents.crypto)
        : JSON.parse(
          Uint8arrays.toString(
            await dependents.depot.getUnixFile(
              decodeCID(authorised)
            ),
            "utf8"
          )
        )
    ),
    {
      tries: 20,
      timeout: 60000,
      timeoutMessage: "Trying to retrieve UCAN(s) and readKey(s) from the auth lobby timed out after 60 seconds."
    }
  )

  if (!secrets) {
    throw new Error("Failed to retrieve secrets from lobby url parameters")
  }

  url.searchParams.delete("authorised")
  url.searchParams.delete("cancelled")
  url.searchParams.delete("newUser")
  url.searchParams.delete("username")

  history.replaceState(null, document.title, url.toString())

  return { ...secrets, username }
}


/**
 * Redirects to a lobby.
 *
 * NOTE: Only works on the main thread, as it uses `window.location`.
 */
export async function request(
  endpoints: Fission.Endpoints,
  dependents: Dependents,
  options: RequestOptions = {}
): Promise<void> {
  const { permissions } = options

  const app = permissions?.app
  const fs = permissions?.fs
  const platform = permissions?.platform
  const raw = permissions?.raw
  const sharing = permissions?.sharing

  const exchangeDid = await DID.exchange(dependents.crypto)
  const writeDid = await DID.write(dependents.crypto)
  const sharedRepo = !!document.body.querySelector("iframe#webnative-ipfs") && typeof SharedWorker === "function"
  const redirectTo = options.returnUrl || window.location.href

  // Compile params
  const params = [
    [ "didExchange", exchangeDid ],
    [ "didWrite", writeDid ],
    [ "redirectTo", redirectTo ],
    [ "sdk", VERSION.toString() ],
    [ "sharedRepo", sharedRepo ? "t" : "f" ],
    [ "sharing", sharing ? "t" : "f" ]

  ].concat(
    app ? [ [ "appFolder", `${app.creator}/${app.name}` ] ] : [],
    fs?.private ? fs.private.map(p => [ "privatePath", Path.toPosix(p, { absolute: true }) ]) : [],
    fs?.public ? fs.public.map(p => [ "publicPath", Path.toPosix(p, { absolute: true }) ]) : [],
    raw ? [ [ "raw", Base64.urlEncode(JSON.stringify(raw)) ] ] : [],
    options.extraParams ? Object.entries(options.extraParams) : []

  ).concat((() => {
    const apps = platform?.apps

    switch (typeof apps) {
      case "string": return [ [ "app", apps ] ]
      case "object": return apps.map(a => [ "app", a ])
      default: return []
    }

  })())

  // And, go!
  window.location.href = endpoints.lobby + "?" +
    params
      .map(([ k, v ]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
      .join("&")
}



// COLLECTION HELPERS


type LobbyClassifiedInfo = {
  sessionKey: string
  secrets: string
  iv: string
}

type LobbySecrets = {
  fs: Record<string, { key: string; bareNameFilter: string }>
  ucans: string[]
}

async function getClassifiedViaPostMessage(
  endpoints: Fission.Endpoints,
  crypto: Crypto.Implementation
): Promise<LobbyClassifiedInfo> {
  const didExchange = await DID.exchange(crypto)
  const iframe: HTMLIFrameElement = await new Promise(resolve => {
    const iframe = document.createElement("iframe")
    iframe.id = "webnative-secret-exchange"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    iframe.style.display = "none"
    document.body.appendChild(iframe)

    iframe.onload = () => {
      resolve(iframe)
    }

    iframe.src = `${endpoints.lobby}/exchange.html`
  })

  return new Promise((resolve, reject) => {
    function stop() {
      window.removeEventListener("message", listen)
      document.body.removeChild(iframe)
      reject()
    }

    function listen(event: MessageEvent<string>) {
      if (new URL(event.origin).host !== new URL(endpoints.lobby).host) return stop()
      if (event.data == null) return stop()

      try {
        const classifiedInfo = JSON.parse(event.data)
        if (!isLobbyClassifiedInfo(classifiedInfo)) stop()
        window.removeEventListener("message", listen)
        document.body.removeChild(iframe)
        resolve(classifiedInfo)
      } catch {
        stop()
      }
    }

    window.addEventListener("message", listen)

    if (iframe.contentWindow == null) {
      throw new Error("Can't import UCANs & readKey(s): No access to its contentWindow")
    }

    const message = {
      webnative: "exchange-secrets",
      didExchange
    }

    iframe.contentWindow.postMessage(message, iframe.src)
  })
}

function isLobbyClassifiedInfo(obj: unknown): obj is LobbyClassifiedInfo {
  return TypeChecks.isObject(obj)
    && TypeChecks.isString(obj.sessionKey)
    && TypeChecks.isString(obj.secrets)
    && TypeChecks.isString(obj.iv)
}

function isLobbySecrets(obj: unknown): obj is LobbySecrets {
  return TypeChecks.isObject(obj)
    && TypeChecks.isObject(obj.fs)
    && Object.values(obj.fs).every(a => TypeChecks.hasProp(a, "key") && TypeChecks.hasProp(a, "bareNameFilter"))
    && Array.isArray(obj.ucans)
    && obj.ucans.every(a => TypeChecks.isString(a))
}

async function translateClassifiedInfo(
  { crypto }: Dependents,
  classifiedInfo: LobbyClassifiedInfo
): Promise<{ fileSystemSecrets: Capabilities.FileSystemSecret[]; ucans: Ucan.Ucan[] }> {
  // Extract session key
  const rawSessionKey = await crypto.keystore.decrypt(
    Uint8arrays.fromString(classifiedInfo.sessionKey, "base64pad")
  )

  // The encrypted session key and read keys can be encoded in both UTF-16 and UTF-8.
  // This is because keystore-idb uses UTF-16 by default, and that's what webnative used before.
  // ---
  // This easy way of detection works because the decrypted session key is encoded in base 64.
  // That means it'll only ever use the first byte to encode it, and if it were UTF-16 it would
  // split up the two bytes. Hence we check for the second byte here.
  const isUtf16 = rawSessionKey[ 1 ] === 0

  const sessionKey = Uint8arrays.fromString(
    isUtf16
      ? new TextDecoder("utf-16").decode(rawSessionKey)
      : Uint8arrays.toString(rawSessionKey, "utf8"),
    "base64pad"
  )

  // Decrypt secrets
  const secretsStr = await crypto.aes.decrypt(
    Uint8arrays.fromString(classifiedInfo.secrets, "base64pad"),
    sessionKey,
    Crypto.SymmAlg.AES_GCM,
    Uint8arrays.fromString(classifiedInfo.iv, "base64pad")
  )

  const secrets: unknown = JSON.parse(
    Uint8arrays.toString(secretsStr, "utf8")
  )

  if (!isLobbySecrets(secrets)) throw new Error("Invalid secrets received")

  const fileSystemSecrets: Capabilities.FileSystemSecret[] =
    isLobbySecrets(secrets)
      ? Object
        .entries(secrets.fs)
        .map(([ posixPath, { bareNameFilter, key } ]) => {
          return {
            bareNameFilter: bareNameFilter,
            path: Path.fromPosix(posixPath),
            readKey: Uint8arrays.fromString(key, "base64pad")
          }
        })
      : []

  const ucans: Ucan.Ucan[] = secrets.ucans.map(
    (u: string) => Ucan.decode(u)
  )

  return {
    fileSystemSecrets,
    ucans,
  }
}



// HELPERS


async function retry<T>(
  action: () => Promise<T>,
  options: { tries: number; timeout: number; timeoutMessage: string }
): Promise<T | null> {
  return await Promise.race([
    (async () => {
      let returnValue
      let tryNum = 1
      while (tryNum <= options.tries) {
        try {
          returnValue = await action()
        } catch (e) {
          if (tryNum == options.tries) {
            throw e
          }
        }
        tryNum++
      }
      return returnValue || null
    })(),
    new Promise<T>((resolve, reject) => setTimeout(
      () => reject(new Error(options.timeoutMessage)),
      options.timeout
    ))
  ])
}



// 🛳


export function implementation(
  endpoints: Fission.Endpoints,
  dependents: Dependents
): Implementation {
  return {
    collect: () => collect(endpoints, dependents),
    request: (...args) => request(endpoints, dependents, ...args)
  }
}
