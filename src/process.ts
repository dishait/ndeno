import { cyan, red, yellow } from "./color.ts"
import { which } from "https://deno.land/x/which@0.2.2/mod.ts"

export async function execa(cmd: string[]) {
  const command = await which(cmd.shift()!)

  const process = Deno.run({
    cmd: [command!, ...cmd],
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
  })

  let closed = false

  function childExit() {
    if (!closed) {
      // No need to manually pass in signo
      Deno.kill(process.pid)
      Deno.close(process.rid)
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

  const { success, code } = await process.status()

  process.close()

  if (!success) {
    console.log(`❎ ${red("Task execution failed")}`)
    Deno.exit(code)
  }
}

export function normalFusing() {
  console.log(`🥰 all right, ${cyan("have a good time!!")}`)
  Deno.exit(0)
}
