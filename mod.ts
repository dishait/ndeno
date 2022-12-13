import { execa as _execa } from "https://esm.sh/execa@6.1.0";
import {
  cyan,
  dim,
  green,
  yellow,
} from "https://deno.land/std@0.167.0/fmt/colors.ts";

export async function exist(path: string) {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

export function execa(cmd: string[]) {
  return _execa(cmd.shift()!, cmd, {
    stderr: "inherit",
    stdout: "inherit",
  });
}

export function creatLocalStorageRef<T extends string>(key: string) {
  let v: T;
  return {
    get value() {
      return v ??= localStorage.getItem(key) as T;
    },
    set value(nv) {
      v = nv;
      localStorage.setItem(key, nv);
    },
  };
}

type PackageManager = "npm" | "yarn" | "pnpm";

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
    // install
    if (Deno.args.length === 0) {
      return [ref.value, "install"];
    }

    // Not supported by yarn install
    if (
      ref.value === "yarn" && Deno.args.length > 1 &&
      (Deno.args[0] === "i" || Deno.args[0] === "install")
    ) {
      Deno.args[0] = "add";
    }

    // Most manager commands are compatible
    if (ref.value !== "npm") {
      return [ref.value, ...Deno.args];
    }

    // npm run script
    if (
      !/run|install|test|publish|uninstall|help|add|remove|i/.test(
        Deno.args[0],
      )
    ) {
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

const {
  staging,
  getCommand,
  ref: packageManager,
} = usePackageManager();

export async function ensureProjectInit() {
  const inited = await exist("package.json");
  if (inited) {
    return;
  }

  const wantInited = await confirm(
    `🫣 ${yellow("package.json does not exist")}, whether to initialize?`,
  );

  if (!wantInited) {
    console.log(`🥰 all right, ${cyan("have a good time!!")}`);
    Deno.exit(0);
  }

  packageManager.value = prompt(
    `🤯 Input your package manager ${dim("(npm | yarn | pnpm)")}`,
    "npm",
  ) as PackageManager;

  const cmd = [packageManager.value, "init"];

  if (packageManager.value !== "pnpm") {
    const skipTedious = await confirm(
      `👻 Whether to ${green("skip complicated steps")}?`,
    );
    if (skipTedious) {
      cmd.push("-y");
    }
  }

  await execa(cmd);
  console.log(`✅ The project initialization succeeded`);
}

async function runCommand() {
  await staging();
  await execa(getCommand());
  console.log(`✅ Command executed successfully`);
}

await ensureProjectInit();

await runCommand();
