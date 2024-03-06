import { logClean } from "./log.ts"
import { join } from "https://deno.land/std@0.212.0/path/mod.ts"
import { exists } from "https://deno.land/std@0.212.0/fs/exists.ts"
import { resolve } from "https://deno.land/std@0.212.0/path/resolve.ts"
import { emptyDir } from "https://deno.land/std@0.212.0/fs/empty_dir.ts"
import {
  createUpBases,
  slash,
} from "https://deno.land/x/easy_std@v0.7.0/src/path.ts"
import { isAbsolute } from "https://deno.land/std@0.212.0/path/is_absolute.ts"

export function existsFile(path: string) {
  return exists(path, {
    isFile: true,
    isDirectory: false,
  })
}

export async function findUp(files: string[], root = Deno.cwd()) {
  const upPaths = createUpBases(root)
  for (const upPath of upPaths) {
    for (const file of files) {
      const path = join(upPath, file)
      if (await exists(path)) {
        return slash(path)
      }
    }
  }
  return null
}

export async function cleanDirs(dirs: Array<string | null>, root = Deno.cwd()) {
  const newDirs = dirs.filter(Boolean).map((dir) => {
    if (isAbsolute(dir!)) {
      return dir
    }
    return resolve(root, dir!)
  }) as string[]
  await Promise.all(newDirs.map(async (dir) => {
    if (await exists(dir)) {
      await emptyDir(dir)
      logClean(dir)
    }
  }))
}

export async function find(files: string[], root = Deno.cwd()) {
  for (const file of files) {
    const resolvedFile = resolve(root, file)
    if (await existsFile(file)) {
      return resolvedFile
    }
  }
  return null
}

export async function cleanWorkspaces(workspaces: string[], dirs: string[]) {
  await Promise.all(
    workspaces.map((workspace) => cleanDirs(dirs, workspace)),
  )
}
