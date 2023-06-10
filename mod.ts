import {
  brightGreen,
  brightYellow,
  Command,
  emptyDir,
  ensureFile,
  EnumType,
  gray,
  yellow,
} from "./src/deps.ts"
import {
  ensurePackageJson,
  existsFile,
  findUpDetectPM,
  findUpLock,
  findUpNodeModulesPath,
  getPackageCommands,
  PM_LOCKS,
} from "./src/pm.ts"
import { execa, execaInstall } from "./src/process.ts"
import { version } from "./src/version.ts"

import type { Options, PM } from "./src/type.ts"

function formatOptions(originOptions: Options) {
  const options = Object.keys(originOptions).filter((k) => {
    if (typeof originOptions[k] === "boolean") {
      return true
    }
    return false
  })
  if (originOptions.dir) {
    options.push(`--dir=${originOptions.dir}`)
  }
  return options.map((o) => {
    if (o === "dev") {
      return "-D"
    }
    if (o === "prod") {
      return "-P"
    }
    return o
  })
}

if (import.meta.main) {
  const pm = await findUpDetectPM()

  const commander = new Command()
    .name("n")
    .version(version)
    .description(`Command line tool created by deno to manage node projects`)
    .action(async () => {
      await ensurePackageJson()
      execaInstall(pm)
    })

  const packageCommands = await getPackageCommands()
  if (packageCommands) {
    Object.keys(packageCommands).forEach((ck) => {
      const cv = packageCommands[ck]
      const runCommand = new Command().description(
        `${gray(cv)}`,
      ).action(async () => {
        await execa([pm, "run", ck])
      })
      commander.command(ck, runCommand)
    })
  }

  const install = new Command()
    .alias("install")
    .description(`${brightGreen(pm)} install deps`)
    .option("-g, --global", "Global installation")
    .option("-C, --dir <dir:string>", "Change to directory <dir>")
    .option(
      `-P, --prod`,
      `Packages in ${brightYellow(`devDependencies`)} won't be installed`,
    )
    .option(
      "-w, --workspace-root",
      `Run the command on the root workspace project ${
        brightYellow("(only pnpm)")
      }`,
    )
    .option(
      `-D, --dev`,
      `Only ${
        brightYellow(`devDependencies`)
      } are installed regardless of the ${brightGreen(`NODE_ENV`)}`,
      {
        conflicts: [`prod`],
      },
    )
    .option(
      "-r, --recursive",
      `Run the command for each project in the workspace ${
        brightYellow("(only pnpm)")
      }`,
    )
    .arguments("[...deps:string]")
    .action(
      async (options, ...deps) => {
        await execaInstall(pm, deps, formatOptions(options))
      },
    )

  const reinstall = new Command().alias("reinstall")
    .description(`${brightGreen(pm)} reinstall deps`).option(
      "-w, --withLock",
      "with lock",
      {
        default: false,
      },
    ).action(
      async ({ withLock }) => {
        if (withLock) {
          const lock = await findUpLock(pm)
          if (lock) {
            await Deno.remove(lock)
          }
        }

        const node_modules_path = await findUpNodeModulesPath()
        if (node_modules_path) {
          await emptyDir(node_modules_path)
          console.log(
            `\n${brightGreen("√ clean")} ${gray(node_modules_path)} \n`,
          )
        }
        await execaInstall(pm)
      },
    )

  const PMS = Object.keys(PM_LOCKS)
  const PM_TYPE = new EnumType(PMS)
  const _switch = new Command().alias("switch").description(
    `switch ${brightGreen(pm)} to ${
      PMS.filter((p) => p !== pm).map((p) => yellow(p)).join(" or ")
    }`,
  ).type(
    "PM_TYPE",
    PM_TYPE,
  ).arguments("<pm:PM_TYPE>").action(async (_, newPM) => {
    const existedLock = PM_LOCKS[pm]
    if (await existsFile(existedLock)) {
      await Deno.remove(existedLock)
    }
    const newLock = PM_LOCKS[newPM as PM]
    await ensureFile(newLock)
  })

  const init = new Command().alias("init").description("init new project")
    .type(
      "PM_TYPE",
      PM_TYPE,
    ).arguments("<pm:PM_TYPE>")
    .action(async (_, newPM) => {
      const newLock = PM_LOCKS[newPM as PM]
      await Promise.all([
        ensureFile(newLock),
        ensurePackageJson(),
      ])
    })

  await commander
    .command("in", init)
    .command("i", install)
    .command("ri", reinstall)
    .command("sw", _switch)
    .parse(Deno.args)
}
