import type { PM } from "./constant.ts"
import { execa } from "https://deno.land/x/easy_std@v0.4.1/src/process.ts"

export async function getPackageCommands() {
  try {
    const packageText = await Deno.readTextFile("package.json")
    const scripts = JSON.parse(packageText)["scripts"] || {}
    return scripts as Record<string, string>
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
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
