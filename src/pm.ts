import {
  createContext,
  exists,
  expandGlob,
  isAbsolute,
  isGlob,
  join,
  parse,
  relative,
  resolve,
  slash,
} from "./deps.ts"
import { execa } from "./process.ts"
import { find, findUp } from "./find.ts"
import { createUpBases } from "./deps.ts"

export type PmType = "npm" | "yarn" | "pnpm" | "deno" | "bun"

export type NodePmType = Exclude<PmType, "deno" | "bun">

export type Script = {
  cwd: string
  key: string
  value: string
  magicKey: string
  relativedWorkspace?: string
}

export type PmCtx<T extends PmType = "npm"> = {
  type: T
  scripts: Script[]
  workspaces: string[]
  lockFile: string | null
  uninstall: (deps: string[]) => Promise<void>
  install: (deps?: string[], options?: string[]) => Promise<void>
}

const pmCtx = createContext<PmCtx<PmType>>()

export const nodePms = ["npm", "pnpm", "yarn", "bun"] as const

export async function initPm(root = Deno.cwd()) {
  const type = await loadType(root)

  const workspaces = await loadWorkspaces(type, root)

  const scripts = await loadScriptsWithWorkspaces(type, root, workspaces)

  const lockFile = await findUpLockFile(type, root)

  const ctx: PmCtx<PmType> = {
    type,
    scripts,
    lockFile,
    workspaces,
    async uninstall(deps: string[]) {
      if (this.type === "deno" || deps.length === 0) {
        return
      }
      const isNpm = this.type === "npm"
      await execa([this.type, isNpm ? "uninstall" : "remove", ...deps])
      return
    },
    async install(deps: string[] = [], options: string[] = []) {
      if (this.type === "deno") {
        return
      }
      const isYarn = this.type === "yarn"
      if (isYarn && deps.length === 0) {
        await execa([this.type, ...options])
        return
      }
      await execa(
        [this.type, isYarn ? "add" : "install", ...deps, ...options],
      )
      return
    },
  }

  pmCtx.set(ctx)
}

export function usePm() {
  return pmCtx.use()
}

export async function loadWorkspaces(pm: PmType, root = Deno.cwd()) {
  const dirs = [root]
  if (pm !== "pnpm") {
    return dirs.map(slash)
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

    return Array.from(new Set(dirs)).map(slash)
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return dirs.map(slash)
    }
    throw error
  }
}

export async function loadScriptMap(file: string, key: string) {
  const scriptsMap = new Map<string, string>()
  try {
    const packageText = await Deno.readTextFile(file)
    const scripts: Record<string, string> = JSON.parse(packageText)[key] || {}
    Object.entries(scripts).forEach(([key, script]) => {
      scriptsMap.set(key, script)
    })
    return scriptsMap
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return scriptsMap
    }
    if (error instanceof SyntaxError) {
      return scriptsMap
    }
    throw error
  }
}

export async function loadScriptsWithWorkspaces(
  pm: PmType,
  root: string = Deno.cwd(),
  workspaces: string[],
) {
  const scripts: Script[] = []
  const scriptSet = new Set<string>()

  if (pm === "deno") {
    for (const workspace of workspaces) {
      const file = await find(["deno.jsonc", "deno.json"], workspace)
      if (!file) {
        continue
      }
      await loadScript(workspace, file, "tasks")
    }
    return scripts
  }

  for (const workspace of workspaces) {
    const file = resolve(workspace, "package.json")
    await loadScript(workspace, file, "scripts")
  }

  return scripts

  async function loadScript(workspace: string, file: string, key: string) {
    const isRoot = slash(workspace) === slash(root)
    const relativedWorkspace = isRoot ? "" : slash(relative(root, workspace))

    const scriptMap = await loadScriptMap(file, key)
    scriptMap.forEach((v, k) => {
      const magicKey = isRoot
        ? k
        : `${relativedWorkspace.replaceAll("/", ":")}:${k}`
      if (scriptSet.has(magicKey)) {
        return
      }
      scripts.push({
        key: k,
        magicKey,
        value: v,
        cwd: workspace,
        relativedWorkspace,
      })
      scriptSet.add(magicKey)
    })
  }
}

export async function loadType(root = Deno.cwd()) {
  const bases = createUpBases(root)

  const files = [
    "package.json",
    "deno.jsonc",
    "deno.json",
    "deno.lock",
    "bun.lockb",
    "pnpm-lock.yaml",
    "yarn.lock",
    "package-lock.json",
  ]

  for (const base of bases) {
    for (const file of files) {
      const path = join(base, file)
      if (await exists(path)) {
        const type = await getTypeFormFile(file)
        if (type) {
          return type
        }
      }
    }
  }

  return "npm"
}

export function getLockFromPm(pm: PmType) {
  switch (pm) {
    case "deno":
      return "deno.lock"
    case "bun":
      return "bun.lockb"
    case "pnpm":
      return "pnpm-lock.yaml"
    case "yarn":
      return "yarn.lock"
    case "npm":
      return "package-lock.json"
    default:
      return "package-lock.json"
  }
}

export function findUpLockFile(type: PmType, root = Deno.cwd()) {
  return findUp([getLockFromPm(type)], root)
}

export async function getTypeFormFile(file: string) {
  if (file.endsWith("package.json")) {
    const packageText = await Deno.readTextFile(file)
    try {
      const { packageManager } = JSON.parse(packageText) as {
        packageManager?: string
      } ?? {}
      if (packageManager) {
        return packageManager.split("@")[0] as NodePmType
      }
    } catch (error) {
      console.warn(`detectPackageManager(package.json): ${error}`)
    }
  }

  const denoFiles = ["deno.jsonc", "deno.json", "deno.lock"]
  if (denoFiles.some((f) => file.endsWith(f))) {
    return "deno"
  }

  if (file.endsWith("pnpm-lock.yaml")) {
    return "pnpm"
  }

  if (file.endsWith("yarn.lock")) {
    return "yarn"
  }

  if (file.endsWith("bun.lockb")) {
    return "bun"
  }

  return null
}
