import {
  cyan,
  dim,
  green,
  yellow,
} from "https://deno.land/std@0.178.0/fmt/colors.ts";

import { listLog } from "./src/log.ts";
import { exist, findUpNodeModules, findUpPackageJson } from "./src/fs.ts";
import type { PackageManager } from "./src/pm.ts";
import { execa, normalFusing } from "./src/process.ts";
import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import { isPackageManager, usePackageManager } from "./src/pm.ts";
import { extractDeps, extractDepsFromPackageJson } from "./src/deps.ts";

const {
  staging,
  getCommand,
  ref: packageManager,
} = usePackageManager();

function inputPackageManager() {
  packageManager.value = prompt(
    `🤯 Input your package manager ${
      dim(
        "(npm | yarn | pnpm)",
      )
    }`,
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
  const ignore = Deno.args.length !== 0 || (await exist("package.json"));
  if (ignore) {
    return false;
  }

  const wantInited = confirm(
    `🫣 ${
      yellow(
        " package.json does not exist",
      )
    }, whether to initialize?`,
  );

  if (!wantInited) {
    normalFusing();
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

function refresh() {
  if (Deno.args[0] === "refresh") {
    if (isPackageManager(Deno.args[1])) {
      packageManager.value = Deno.args[1];
      return here(true);
    }

    const wantRefresh = confirm(
      `🙄 Do you want to refresh the package manager ${green("in the cache")}?`,
    );

    if (!wantRefresh) normalFusing();

    inputPackageManager();

    return here(true);
  }
}

function here(see = Deno.args[0] === "here") {
  if (see) {
    console.log(
      `🦖 The manager of the current directory is ${
        cyan(
          packageManager.value ?? "null",
        )
      }`,
    );
  }

  return see;
}
async function autoInstall(
  autoInstallFlag = Deno.args[0] === "i" && Deno.args[1] === "-a",
) {
  if (!autoInstallFlag) {
    return false;
  }

  const baseDir = Deno.cwd();
  const packageJsonPath = await findUpPackageJson(baseDir) || "";
  const depsInPackageJson = await extractDepsFromPackageJson(packageJsonPath);

  const nodeModulesPath = await findUpNodeModules(baseDir) || "";

  const depsNotInstalled = await Promise.all(
    depsInPackageJson.map(async (dep) => {
      return { name: dep, exist: await exist(join(nodeModulesPath, dep)) };
    }),
  ).then((deps) => deps.filter((dep) => !dep.exist).map((dep) => dep.name));

  const deps = await extractDeps(baseDir);

  const depsNotInPackageJson = deps.filter((dep) =>
    !depsInPackageJson.includes(dep)
  );

  const depsToInstall = depsNotInPackageJson.concat(depsNotInstalled);

  if (depsToInstall.length) {
    console.log(
      `📂 The dependencies are detected from ${yellow("files")}`,
    );
    console.log(listLog(depsNotInPackageJson));

    console.log(
      `🌳 The dependencies are detected from ${green("package.json")}`,
    );
    console.log(listLog(depsInPackageJson));

    const wantInstallDeps = confirm(
      `📂 Whether to install dependencies from ${
        yellow(
          "files",
        )
      } and from ${
        green(
          "package.json",
        )
      } ?`,
    );

    if (wantInstallDeps) {
      await execa([
        packageManager.value ?? "npm",
        packageManager.value === "yarn" ? "add" : "install",
        ...depsToInstall,
      ]);
    }
  }
  console.log(`✅ Automatic install successfully`);
  return true;
}
const tasks = [
  hopeCreateProject,
  refresh,
  here,
  ensureProjectInit,
  autoInstall,
  runCommand,
];

for (const task of tasks) {
  const fusing = await task();

  if (fusing) {
    break;
  }
}
