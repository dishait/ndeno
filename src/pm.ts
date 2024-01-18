import { basename } from "https://deno.land/std@0.212.0/path/basename.ts"
import { execa } from "./process.ts"
import { locks, type PM } from "./constant.ts"
import { existsFile, findUp } from "./fs.ts"
import { parse } from "https://deno.land/std@0.212.0/yaml/parse.ts"
import { isGlob } from "https://deno.land/std@0.212.0/path/is_glob.ts"
import { resolve } from "https://deno.land/std@0.212.0/path/resolve.ts"
import { isAbsolute } from "https://deno.land/std@0.212.0/path/is_absolute.ts"
import { expandGlob } from "https://deno.land/std@0.212.0/fs/expand_glob.ts"

export async function loadPackageCommands(
  file = "package.json",
  key = "scripts",
) {
  try {
    const packageText = await Deno.readTextFile(file)
    const scripts = JSON.parse(packageText)[key] || {}
    return scripts as Record<string, string>
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null
    }
    if (error instanceof SyntaxError) {
      return null
    }
    throw error
  }
}

export function install(
  pm: PM,
  deps: string[] = [],
  options: string[] = [],
) {
  const isYarn = pm === "yarn"
  if (isYarn && deps.length === 0) {
    return execa([pm, ...options])
  }
  return execa(
    [pm, isYarn ? "add" : "install", ...deps, ...options],
  )
}

export function unInstall(pm: PM, deps: string[]) {
  const isNpm = pm === "npm"
  return execa([pm, isNpm ? "uninstall" : "remove", ...deps])
}

export function getPmFromPath(path: string) {
  switch (basename(path)) {
    case "pnpm-lock.yaml":
      return "pnpm"
    case "yarn.lock":
      return "yarn"
    default:
      return "npm"
  }
}

export function getLockFromPm(pm: PM) {
  switch (pm) {
    case "pnpm":
      return "pnpm-lock.yaml"
    case "yarn":
      return "yarn.lock"
    default:
      return "package-lock.json"
  }
}

export async function detectPackageManager() {
  const lockPath = await findUp(locks)

  if (!lockPath) {
    const packageJson = await findUp(["package.json"])
    if (packageJson && await existsFile(packageJson)) {
      const packageText = await Deno.readTextFile(packageJson)
      try {
        const { packageManager } = JSON.parse(packageText) as {
          packageManager?: string
        }
        if (!packageManager) {
          return "npm"
        }
        return packageManager.split("@")[0] as "npm" | "pnpm" | "yarn"
      } catch (error) {
        console.log(`detectPackageManager(package.json): ${error}`)
        return "npm"
      }
    }
  }

  return getPmFromPath(lockPath ?? "")
}

export async function loadWorkspaces(pm: PM) {
  const root = Deno.cwd()
  const dirs = [root]
  if (pm !== "pnpm") {
    return dirs
  }

  try {
    const workspaceText = await Deno.readTextFile("pnpm-workspace.yaml")
    const { packages } = parse(workspaceText) as { packages?: string[] }

    if (!packages || !Array.isArray(packages)) {
      return dirs
    }
    for (const p of packages) {
      if (isGlob(p)) {
        const entrys = await Array.fromAsync(expandGlob(p, {
          root,
        }))
        const dirEntryPaths = entrys.filter((entry) => entry.isDirectory).map(
          (entry) => {
            return entry.path
          },
        )
        dirs.push(...dirEntryPaths)
        continue
      }
      if (isAbsolute(p)) {
        dirs.push(p)
        continue
      }
      dirs.push(resolve(root, p))
    }

    return Array.from(new Set(dirs))
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return dirs
    }
    throw error
  }
}
