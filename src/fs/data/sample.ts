import * as Path from "../../path/index.js"
import { FileSystem } from "../class.js"

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
