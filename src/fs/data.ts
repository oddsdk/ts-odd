import * as Crypto from "../components/crypto/implementation.js"

import * as DID from "../did/index.js"
import * as FileSystem from "../fs/types.js"
import * as Path from "../path/index.js"
import * as Sharing from "./share.js"


/**
 * Adds some sample to the file system.
 */
export async function addSampleData(fs: FileSystem.API): Promise<void> {
  await fs.mkdir(Path.directory("private", "Apps"))
  await fs.mkdir(Path.directory("private", "Audio"))
  await fs.mkdir(Path.directory("private", "Documents"))
  await fs.mkdir(Path.directory("private", "Photos"))
  await fs.mkdir(Path.directory("private", "Video"))

  // Files
  await fs.write(
    Path.file("private", "Welcome.txt"),
    new TextEncoder().encode("Welcome to your personal transportable encrypted file system 👋")
  )
}

/**
 * Stores the public part of the exchange key in the DID format,
 * in the `/public/.well-known/exchange/DID_GOES_HERE/` directory.
 */
export async function addPublicExchangeKey(
  crypto: Crypto.Implementation,
  fs: FileSystem.API
): Promise<void> {
  const publicDid = await DID.exchange(crypto)

  await fs.mkdir(
    Path.combine(Sharing.EXCHANGE_PATH, Path.directory(publicDid))
  )
}


/**
 * Checks if the public exchange key was added in the well-known location.
 * See `addPublicExchangeKey()` for the exact details.
 */
export async function hasPublicExchangeKey(
  crypto: Crypto.Implementation,
  fs: FileSystem.API
): Promise<boolean> {
  const publicDid = await DID.exchange(crypto)

  return fs.exists(
    Path.combine(Sharing.EXCHANGE_PATH, Path.directory(publicDid))
  )
}