import { logClean } from "./log.ts"
import { denoConfigFiles } from "./constant.ts"
import { join } from "https://deno.land/std@0.209.0/path/mod.ts"
import { exists } from "https://deno.land/std@0.209.0/fs/exists.ts"
import { resolve } from "https://deno.land/std@0.209.0/path/resolve.ts"
import { emptyDir } from "https://deno.land/std@0.209.0/fs/empty_dir.ts"
import { createUpBases } from "https://deno.land/x/easy_std@v0.6.1/src/path.ts"

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

export async function cleanDirs(dirs: Array<string | null>) {
  await Promise.all(dirs.map(async (dir) => {
    if (dir && await exists(dir)) {
      await emptyDir(dir)
      logClean(resolve(dir))
    }
  }))
}

export async function findUpDenoConfigFile() {
  const path = await findUp(denoConfigFiles)
  return path
}

export async function isDenoProject() {
  const path = await findUpDenoConfigFile()
  return Boolean(path)
}
