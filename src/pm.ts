import { exist } from "./fs.ts";
import { creatLocalStorageRef } from "./storage.ts";

export type PackageManager = "npm" | "yarn" | "pnpm";

export function usePackageManager() {
  const cwd = Deno.cwd();
  const ref = creatLocalStorageRef<PackageManager>(cwd);

  async function staging() {
    if (ref.value) {
      return;
    }
    if (await exist("pnpm-lock.yaml")) {
      ref.value = "pnpm";
    } else if (await exist("yarn.lock")) {
      ref.value = "yarn";
    } else {
      ref.value = "npm";
    }
  }

  function getCommand() {
    const { length } = Deno.args;
    // install
    if (length === 0) {
      return [ref.value, "install"];
    }

    const command = Deno.args[0];

    // Not supported by yarn install
    if (
      ref.value === "yarn" &&
      length > 1 &&
      (command === "i" || command === "install")
    ) {
      return [ref.value, "add", ...Deno.args.slice(1)];
    }

    // Most manager commands are compatible
    if (ref.value !== "npm") {
      return [ref.value, ...Deno.args];
    }

    const isRunScript =
      !/^(run|install|test|publish|uninstall|help|add|remove|i)$/.test(
        command,
      );

    // npm run script
    if (isRunScript) {
      return [ref.value, "run", ...Deno.args];
    }

    return [ref.value, ...Deno.args];
  }

  return {
    ref,
    staging,
    getCommand,
  };
}

export function isPackageManager(v: string): v is PackageManager {
  switch (v) {
    case "npm":
    case "yarn":
    case "pnpm":
      return true;
    default:
      return false;
  }
}
