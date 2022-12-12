import { execa } from "npm:execa";
import {
  cyan,
  dim,
  green,
  yellow,
} from "https://deno.land/std@0.167.0/fmt/colors.ts";

type PackageManager = "npm" | "yarn" | "pnpm";

let packageManager: PackageManager;

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

export async function getPackageManager() {
  if (packageManager) {
    return packageManager;
  }

  const isPnpm = await exist("pnpm-lock.yaml");
  if (isPnpm) {
    return "pnpm";
  }

  const isYarn = await exist("yarn.lock");
  if (isYarn) {
    return "yarn";
  }

  return "npm";
}

export async function getPackageManagerCommand() {
  packageManager = await getPackageManager();

  // install
  if (Deno.args.length === 0) {
    return [packageManager, "install"];
  }

  // Most manager commands are compatible
  if (packageManager !== "npm") {
    return [packageManager, ...Deno.args];
  }

  // npm run script
  if (!/run|install|test|publish|uninstall|i/.test(Deno.args[0])) {
    return [packageManager, "run", ...Deno.args];
  }

  return [packageManager, ...Deno.args];
}

export function runCmd(cmd: string[]) {
  const command = cmd.shift();
  return execa(command!, cmd, {
    stderr: "inherit",
    stdout: "inherit",
  });
}

export async function ensureNodeProjectInit() {
  const inited = await exist("package.json");
  if (inited) {
    return false;
  }

  const wantInited = await confirm(
    `🫣 ${yellow("package.json does not exist")}, whether to initialize?`,
  );

  if (!wantInited) {
    console.log(`🥰 all right, ${cyan("have a good time!!")}`);
    Deno.exit(0);
  }

  packageManager = prompt(
    `🤯 Input your package manager ${dim("(npm | yarn | pnpm)")}`,
    "npm",
  ) as PackageManager;

  const cmd = [packageManager, "init"];

  if (packageManager !== "pnpm") {
    const skipTedious = await confirm(
      `👻 Whether to ${green("skip complicated steps")}?`,
    );
    if (skipTedious) {
      cmd.push("-y");
    }
  }

  await runCmd(cmd);

  return true;
}

const runed = await ensureNodeProjectInit();

if (runed) {
  console.log(`✅ The project initialization succeeded`);
}

const cmd = await getPackageManagerCommand();

await runCmd(cmd);

console.log(`✅ Command executed successfully`);
