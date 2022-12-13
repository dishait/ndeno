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
    stdin: "inherit",
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
    const { length } = Deno.args;
    // install
    if (length === 0) {
      return [ref.value, "install"];
    }

    const command = Deno.args[0];

    // Not supported by yarn install
    if (
      ref.value === "yarn" && length > 1 &&
      (command === "i" || command === "install")
    ) {
      return [ref.value, "add", ...Deno.args.slice(1)];
    }

    // Most manager commands are compatible
    if (ref.value !== "npm") {
      return [ref.value, ...Deno.args];
    }

    // npm run script
    if (
      !/run|install|test|publish|uninstall|help|add|remove|i/.test(
        command,
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

export async function hopeCreateProject() {
  if (Deno.args[0] !== "create") {
    return false;
  }

  packageManager.value = prompt(
    `🤯 Input your package manager ${dim("(npm | yarn | pnpm)")}`,
    "npm",
  ) as PackageManager;

  await execa(getCommand());

  console.log(`✅ The project create succeeded`);

  return true;
}

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

const projectCreated = await hopeCreateProject();

if (!projectCreated) {
  await ensureProjectInit();
  await runCommand();
}
