import { Branch } from "../path/index.js"
import FileSystem from "./filesystem.js"


export async function addSampleData(fs: FileSystem): Promise<void> {
  await fs.mkdir({ directory: [ Branch.Private, "Apps" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Audio" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Documents" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Photos" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Video" ] })
  await fs.publish()
}