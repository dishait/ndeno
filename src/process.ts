import { which as _which } from "./deps.ts"

import { useThermalFn } from "./cache.ts"

import type { AnyFunction, PM } from "./type.ts"

const which = useThermalFn(_which)

export async function execa(cmd: string[], options: Deno.CommandOptions = {}) {
  const command = await which(cmd.shift()!)

  const commander = new Deno.Command(command!, {
    args: [...cmd],
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
    ...options,
  })

  let resolved = false
  const process = commander.spawn()
  const removeShutdownEvent = gracefulShutdown(() => {
    if (!resolved) {
      process.kill()
      resolved = true
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

export function execaUnInstall(pm: PM, deps: string[]) {
  const isNpm = pm === "npm"
  return execa([pm, isNpm ? "uninstall" : "remove", ...deps])
}

export function gracefulShutdown(
  shutdown: AnyFunction,
  options: AddEventListenerOptions = {
    once: true,
  },
) {
  async function exitWithShoutdown() {
    await shutdown()
    if (options.once) {
      Deno.addSignalListener("SIGINT", exitWithShoutdown)
    }
    Deno.exit(130)
  }

  // Synchronization error
  globalThis.addEventListener("error", shutdown, options)
  // Main process exit
  globalThis.addEventListener("unload", shutdown, options)
  // Asynchronous error
  globalThis.addEventListener("unhandledrejection", shutdown, options)

  Deno.addSignalListener("SIGINT", exitWithShoutdown)

  return function removeShutdownEvent() {
    globalThis.removeEventListener("error", shutdown)
    globalThis.removeEventListener("unload", shutdown)
    globalThis.removeEventListener("unhandledrejection", shutdown)
    Deno.removeSignalListener("SIGINT", exitWithShoutdown)
  }
}
