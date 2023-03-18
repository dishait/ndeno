import { exist } from "./fs.ts";
import { creatLocalStorageRef } from "./storage.ts";

export type PackageManager = "npm" | "yarn" | "pnpm";

export function usePackageManager() {
  const cwd = Deno.cwd();
  const ref = creatLocalStorageRef<PackageManager>(cwd);

  async function staging() {
    // Check if the value of ref exists
    if (ref.value) return;
    // Set the value of ref based on the existence of certain files
    ref.value = await exist("pnpm-lock.yaml") ? "pnpm" : await exist("yarn.lock") ? "yarn" : "npm";
  }
  
  function getCommand() {
    const pm = ref.value
    const [command, ...args] = Deno.args;
    
    // If there are no arguments, install dependencies by default
    if (args.length === 0) return [pm, "install"];

    // If the command is "i" and the package manager is yarn, convert it to "add"
    if (pm === "yarn" && command === "i") return [pm, "add", ...args];

    // If the package manager is not npm, return the arguments directly
    if (pm !== "npm") return [pm, ...Deno.args];

    // If the command is a script, convert it to "run" command
    const isRunScript = !/^(run|install|test|publish|uninstall|help|add|remove|i)$/.test(command);

    return isRunScript ? [pm, "run", ...Deno.args] : [pm, ...Deno.args];
  }

  return { ref, staging, getCommand };
}

export function isPackageManager(v: string): v is PackageManager {
  // Check if the value of v is one of the package managers
  return ["npm", "yarn", "pnpm"].includes(v);
}
