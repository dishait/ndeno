import { cacheDirs } from "./constant.ts"
import {
  brightGreen,
  emptyDir,
  exists,
  gray,
  isAbsolute,
  resolve,
  slash,
} from "./deps.ts"
import { usePm } from "./pm.ts"

export function logClean(dir: string) {
  console.log(
    `${brightGreen("√ clean")} ${gray(slash(dir))}`,
  )
}

export async function cleanDirs(dirs = cacheDirs, root = Deno.cwd()) {
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

export async function cleanWorkspaces(dirs: string[] = cacheDirs) {
  const pm = usePm()
  await Promise.all(
    pm.workspaces.map((workspace) => cleanDirs(dirs, workspace)),
  )
}
