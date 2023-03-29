import * as Path from "../path/index.js"
import { AnySupportedDataType, DataType } from "./types.js"
import { FileSystem } from "./class.js"


/**
 * Convert Uint8Array to `Data`.
 */
export function dataFromBytes(dataType: "bytes", bytes: Uint8Array): Uint8Array
export function dataFromBytes<K extends string | number | symbol, V>(dataType: "json", bytes: Uint8Array): Record<K, V>
export function dataFromBytes(dataType: "utf8", bytes: Uint8Array): string
export function dataFromBytes<V>(dataType: DataType, bytes: Uint8Array): AnySupportedDataType<V>
export function dataFromBytes<V>(dataType: DataType, bytes: Uint8Array): AnySupportedDataType<V> {
  switch (dataType) {
    case "bytes":
      return bytes

    case "json":
      return JSON.parse(
        new TextDecoder().decode(bytes)
      )

    case "utf8":
      return new TextDecoder().decode(bytes)
  }
}


/**
 * Convert `Data` to Uint8Array.
 */
export function dataToBytes(dataType: "bytes", data: Uint8Array): Uint8Array
export function dataToBytes<K extends string | number | symbol, V>(dataType: "json", data: Record<K, V>): Uint8Array
export function dataToBytes(dataType: "utf8", data: string): Uint8Array
export function dataToBytes<V>(dataType: DataType, data: AnySupportedDataType<V>): Uint8Array
export function dataToBytes(dataType: DataType, data: any): Uint8Array {
  switch (dataType) {
    case "bytes":
      return data

    case "json":
      return new TextEncoder().encode(
        JSON.stringify(data)
      )

    case "utf8":
      return new TextEncoder().encode(data)
  }
}


/**
 * Adds some sample to the file system.
 */
export async function addSampleData(fs: FileSystem): Promise<void> {
  await fs.mkdir(Path.directory("private", "Apps"))
  await fs.mkdir(Path.directory("private", "Audio"))
  await fs.mkdir(Path.directory("private", "Documents"))
  await fs.mkdir(Path.directory("private", "Photos"))
  await fs.mkdir(Path.directory("private", "Video"))

  // Files
  await fs.write(
    Path.file("private", "Welcome.txt"),
    "utf8",
    "Welcome to your personal transportable encrypted file system 👋"
  )
}
