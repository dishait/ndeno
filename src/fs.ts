import { join } from "https://deno.land/std@0.205.0/path/mod.ts"
import { exists } from "https://deno.land/std@0.205.0/fs/exists.ts"
import { createUpBases } from "https://deno.land/x/easy_std@v0.5.3/src/path.ts"

export function existsFile(path: string) {
  return exists(path, {
    isFile: true,
    isDirectory: false,
  })
}

const upPaths = createUpBases()

export async function findUp(files: string[]) {
  for (const upPath of upPaths) {
    for (const file of files) {
      const path = join(upPath, file)
      if (await exists(path)) {
        return path
      }
    }
  }
  return null
}
