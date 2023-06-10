import { which as _which } from "./deps.ts"

import { useThermalFn } from "./cache.ts"

import type { PM } from "./pm.ts"

const which = useThermalFn(_which)

export async function execa(cmd: string[]) {
  const command = await which(cmd.shift()!)

  const commander = new Deno.Command(command!, {
    args: [...cmd],
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
  })

  let resolved = false
  const process = commander.spawn()
  const removeShutdownEvent = gracefulShutdown(() => {
    if (!resolved) {
      process.kill()
      resolved = true
      removeShutdownEvent()
    }
  })
  const { success, code } = await process.status
  resolved = true
  removeShutdownEvent()
  if (!success) {
    Deno.exit(code)
  }
}

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

export function gracefulShutdown(shutdown: (...args: any) => any) {
  function exitWithShoutdown() {
    shutdown()
    Deno.exit(130)
  }

  // Synchronization error
  globalThis.addEventListener("error", shutdown)
  // Main process exit
  globalThis.addEventListener("unload", shutdown)
  // Asynchronous error
  globalThis.addEventListener("unhandledrejection", shutdown)

  Deno.addSignalListener("SIGINT", exitWithShoutdown)

  return function removeShutdownEvent() {
    globalThis.removeEventListener("error", shutdown)
    globalThis.removeEventListener("unload", shutdown)
    globalThis.removeEventListener("unhandledrejection", shutdown)
    Deno.removeSignalListener("SIGINT", exitWithShoutdown)
  }
}
