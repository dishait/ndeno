import { Select } from "https://deno.land/x/cliffy@v0.25.7/mod.ts"

import { creatLocalStorageRef } from "./cache.ts"
import { exists } from "./fs.ts"

export type PackageManager = "npm" | "yarn" | "pnpm"

const pms = ["npm", "yarn", "pnpm"]

export function usePackageManager() {
  const cwd = Deno.cwd()
  const ref = creatLocalStorageRef<PackageManager>(cwd)
  const noRunReg =
    /^(run|install|test|publish|uninstall|help|add|create|remove|i)$/

  async function staging() {
    // Check if the value of ref exists
    if (ref.value) return
    // Set the value of ref based on the existence of certain files
    ref.value = (await exists("pnpm-lock.yaml"))
      ? "pnpm"
      : (await exists("yarn.lock"))
      ? "yarn"
      : "npm"
  }

  function getCommand() {
    const pm = ref.value
    const [command, ...args] = Deno.args

    // If there are no arguments, install dependencies by default
    if (Deno.args.length === 0) return [pm, "install"]

    // If the command is "i" and the package manager is yarn, convert it to "add"
    if (pm === "yarn" && command === "i") return [pm, "add", ...args]

    // If the command is a script, convert it to "run" command
    const isRunScript = !noRunReg.test(command)

    return isRunScript ? [pm, "run", ...Deno.args] : [pm, ...Deno.args]
  }

  async function select() {
    ref.value = (await Select.prompt({
      message: "select your package manager",
      options: pms,
    })) as PackageManager
  }

  return { ref, staging, getCommand, select }
}

export function isPackageManager(v: string): v is PackageManager {
  // Check if the value of v is one of the package managers
  return pms.includes(v)
}
