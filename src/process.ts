import { execa } from "./deps.ts"
import type { PM } from "./type.ts"

export function execaInstall(
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

export function execaUnInstall(pm: PM, deps: string[]) {
  const isNpm = pm === "npm"
  return execa([pm, isNpm ? "uninstall" : "remove", ...deps])
}
