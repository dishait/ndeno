import { which } from "https://deno.land/x/which@0.3.0/mod.ts"

import { cyan, red, yellow } from "./color.ts"

export async function execa(cmd: string[]) {
  const command = await which(cmd.shift()!)

  const commander = new Deno.Command(command!, {
    args: [...cmd],
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
  })

  let resolved = false
  let closed = false
  function childExit() {
    if (!closed) {
      // No need to manually pass in signo
      if (!resolved) {
        process.kill()
      }
    }
    closed = true
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

export function normalFusing() {
  console.log(`🥰 all right, ${cyan("have a good time!!")}`)
  Deno.exit(0)
}
