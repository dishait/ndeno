import { join } from "./src/path.ts"
import { listLog } from "./src/log.ts"
import { cyan, green, yellow } from "./src/color.ts"
import { execa, normalFusing } from "./src/process.ts"
import { isPackageManager, usePackageManager } from "./src/pm.ts"
import { exist, findUpNodeModules, findUpPackageJson } from "./src/fs.ts"
import { extractDeps, extractDepsFromPackageJson } from "./src/extract.ts"

const {
  staging,
  ref: pm,
  getCommand,
  select: selectPM,
} = usePackageManager()

export async function hopeCreateProject() {
  if (Deno.args[0] !== "create") {
    return false
  }

  await selectPM()

  await execa(getCommand())

  console.log(`✅ The project create succeeded`)

  return true
}

export async function ensureProjectInit() {
  const ignore = Deno.args.length !== 0 || (await exist("package.json"))
  if (ignore) {
    return false
  }

  const wantInited = confirm(
    `🫣 ${
      yellow(
        " package.json does not exist",
      )
    }, whether to initialize?`,
  )

  if (!wantInited) {
    normalFusing()
  }

  await selectPM()

  const cmd = [pm.value, "init"]

  if (pm.value !== "pnpm") {
    const skipTedious = confirm(
      `👻 Whether to ${green("skip complicated steps")}?`,
    )
    if (skipTedious) {
      cmd.push("-y")
    }
  }

  await execa(cmd)
  console.log(`✅ The project initialization succeeded`)

  return true
}

async function runCommand() {
  await staging()
  await execa(getCommand())
  console.log(`✅ Command executed successfully`)
  return true
}

async function refresh() {
  if (Deno.args[0] === "refresh") {
    if (isPackageManager(Deno.args[1])) {
      pm.value = Deno.args[1]
      return here(true)
    }

    const wantRefresh = confirm(
      `🙄 Do you want to refresh the package manager ${green("in the cache")}?`,
    )

    if (!wantRefresh) normalFusing()

    await selectPM()

    return here(true)
  }
}

function here(see = Deno.args[0] === "here") {
  if (see) {
    console.log(
      `🦖 The manager of the current directory is ${
        cyan(
          pm.value ?? "null",
        )
      }`,
    )
  }

  return see
}
async function autoInstall(
  autoInstallFlag = Deno.args[0] === "i" && Deno.args[1] === "-a",
) {
  if (!autoInstallFlag) {
    return false
  }

  const baseDir = Deno.cwd()
  const packageJsonPath = await findUpPackageJson(baseDir) || ""
  const depsInPackageJson = await extractDepsFromPackageJson(packageJsonPath)

  const nodeModulesPath = await findUpNodeModules(baseDir) || ""

  const depsNotInstalled = await Promise.all(
    depsInPackageJson.map(async (dep) => {
      return { name: dep, exist: await exist(join(nodeModulesPath, dep)) }
    }),
  ).then((deps) => deps.filter((dep) => !dep.exist).map((dep) => dep.name))

  const deps = await extractDeps(baseDir)

  const depsNotInPackageJson = deps.filter((dep) =>
    !depsInPackageJson.includes(dep)
  )

  const depsToInstall = depsNotInPackageJson.concat(depsNotInstalled)

  if (depsToInstall.length) {
    console.log(
      `📂 The dependencies are detected from ${yellow("files")}`,
    )
    console.log(listLog(depsNotInPackageJson))

    console.log(
      `🌳 The dependencies are detected from ${green("package.json")}`,
    )
    console.log(listLog(depsInPackageJson))

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
    )

    if (wantInstallDeps) {
      await execa([
        pm.value ?? "npm",
        pm.value === "yarn" ? "add" : "install",
        ...depsToInstall,
      ])
    }
  }
  console.log(`✅ Automatic install successfully`)
  return true
}
const tasks = [
  hopeCreateProject,
  refresh,
  here,
  ensureProjectInit,
  autoInstall,
  runCommand,
]

for (const task of tasks) {
  const fusing = await task()

  if (fusing) {
    break
  }
}
