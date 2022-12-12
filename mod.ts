import { execa } from "npm:execa";

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

  if (packageManager !== "npm") {
    return [packageManager, ...Deno.args];
  }

  const command = Deno.args[0];

  // npm run script
  if (!/run|install|test|publish|uninstall|i/.test(command)) {
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
    return;
  }

  const wantInited = await confirm(
    "package.json does not exist, whether to initialize？",
  );

  if (!wantInited) {
    return console.log("all right, have a good time!!");
  }

  packageManager = prompt(
    "Select your package manager (npm | yarn | pnpm)",
    "npm",
  ) as PackageManager;

  const cmd = [packageManager, "init"];

  if (packageManager !== "pnpm") {
    const skipTedious = await confirm("Whether to skip complicated steps?");
    if (skipTedious) {
      cmd.push("-y");
    }
  }

  await runCmd(cmd);
}

await ensureNodeProjectInit();

const cmd = await getPackageManagerCommand();

await runCmd(cmd);
