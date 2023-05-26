import { createFindUpPaths } from "./path.ts"
import { exists } from "https://deno.land/std@0.189.0/fs/exists.ts"
import { resolve } from "https://deno.land/std@0.189.0/path/mod.ts"

export function existsFile(path: string) {
  return exists(path, {
    isFile: true,
    isReadable: true,
    isDirectory: false,
  })
}

export const PM_LOCKS = {
  yarn: "yarn.lock",
  pnpm: "pnpm-lock.yaml",
  npm: "package-lock.lock",
}

const upPaths = createFindUpPaths(Deno.cwd())

export type PMS = keyof typeof PM_LOCKS

export async function detectBasePM(base = Deno.cwd()) {
  if (await existsFile(resolve(base, PM_LOCKS.pnpm))) {
    return "pnpm"
  }

  if (await existsFile(resolve(base, PM_LOCKS.yarn))) {
    return "yarn"
  }

  if (await existsFile(resolve(base, PM_LOCKS.npm))) {
    return "npm"
  }

  return null
}

export async function findUpDetectPM() {
  for (const upPath of upPaths) {
    const pm = await detectBasePM(upPath)
    if (pm) {
      return pm
    }
  }
  return "npm"
}

export async function findUpNodeModulesPath() {
  for (const upPath of upPaths) {
    const path = resolve(upPath, "node_modules")
    if (await exists(path)) {
      return path
    }
  }
}

export async function getPackageCommands() {
  if (await existsFile('package.json')) {
    const packageText = await Deno.readTextFile('package.json')
    try {
       const scripts = JSON.parse(packageText)['scripts'] || {}
      return scripts as Record<string, string>
    } catch (_) {
      return null
    }
  }
  return null
}
