import { which as _which } from "https://deno.land/x/which@0.3.0/mod.ts"

import { useThermalFn } from "./cache.ts"
import { red, yellow } from "./color.ts"

import type { PMS } from "./pm.ts"

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
  function childExit() {
    if (!resolved) {
      // No need to manually pass in signo
      process.kill()
      resolved = true
    }
  }

  // watch ctrl + c
  Deno.addSignalListener("SIGINT", () => {
    console.log(
      `❎ The task was ${yellow("manually interrupted")}`,
    )
    childExit()
    Deno.exit(130)
  })

  // Prevent accidental exit
  globalThis.addEventListener("error", () => {
    childExit()
  })

  globalThis.addEventListener("unhandledrejection", () => {
    childExit()
  })

  globalThis.addEventListener("unload", () => {
    childExit()
  })

  const process = commander.spawn()

  const { success, code } = await process.status
  resolved = true

  if (!success) {
    console.log(`❎ ${red("Task execution failed")}`)
    Deno.exit(code)
  }
}

export function execaInstall(
  pm: PMS,
  deps: string[] = [],
  options: string[] = [],
) {
  const isAdd = deps.length > 1
  const isYarn = pm === "yarn"

  const cmd = isAdd
    ? [pm, isYarn ? "add" : "install", ...deps, ...options]
    : [pm, "install", ...deps, ...options]
  return execa(cmd)
}
