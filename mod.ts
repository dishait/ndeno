import { which } from "https://deno.land/x/which@0.2.1/mod.ts";
import {
  cyan,
  dim,
  green,
  yellow,
} from "https://deno.land/std@0.168.0/fmt/colors.ts";

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

export async function execa(cmd: string[]) {
  const command = await which(cmd.shift()!);

  const p = Deno.run({
    cmd: [command!, ...cmd],
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
  });

  // watch ctrl + c
  Deno.addSignalListener("SIGINT", () => {
    p.kill("SIGINT");
    console.log(`❎ The task was manually interrupted`);
    Deno.exit(0);
  });

  await p.status();
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
      !/run|install|build|test|publish|uninstall|help|add|remove|i/.test(
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

function inputPackageManager() {
  packageManager.value = prompt(
    `🤯 Input your package manager ${dim("(npm | yarn | pnpm)")}`,
    "npm",
  ) as PackageManager;
}

export async function hopeCreateProject() {
  if (Deno.args[0] !== "create") {
    return false;
  }

  inputPackageManager();

  await execa(getCommand());

  console.log(`✅ The project create succeeded`);

  return true;
}

export async function ensureProjectInit() {
  const ignore = Deno.args.length !== 0 || await exist("package.json");
  if (ignore) {
    return false;
  }

  const wantInited = confirm(
    `🫣 ${yellow("package.json does not exist")}, whether to initialize?`,
  );

  if (!wantInited) {
    console.log(`🥰 all right, ${cyan("have a good time!!")}`);
    Deno.exit(0);
  }

  inputPackageManager();

  const cmd = [packageManager.value, "init"];

  if (packageManager.value !== "pnpm") {
    const skipTedious = confirm(
      `👻 Whether to ${green("skip complicated steps")}?`,
    );
    if (skipTedious) {
      cmd.push("-y");
    }
  }

  await execa(cmd);
  console.log(`✅ The project initialization succeeded`);

  return true;
}

async function runCommand() {
  await staging();
  await execa(getCommand());
  console.log(`✅ Command executed successfully`);
  return true;
}

const tasks = [hopeCreateProject, ensureProjectInit, runCommand];

for (const task of tasks) {
  const fusing = await task();

  if (fusing) {
    break;
  }
}
