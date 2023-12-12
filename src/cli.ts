import {
  brightGreen,
  brightYellow,
  gray,
  yellow,
} from "https://deno.land/std@0.208.0/fmt/colors.ts"
import { ensureFile } from "https://deno.land/std@0.208.0/fs/ensure_file.ts"
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/command.ts"
import { EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/types/enum.ts"
import { execa } from "https://deno.land/x/easy_std@v0.6.0/src/process.ts"

import paramCase from "https://deno.land/x/case@2.2.0/paramCase.ts"
import { cacheDirs, locks, type PM, pms } from "./constant.ts"
import { cleanDirs, existsFile, findUp, findUpDenoConfigFile } from "./fs.ts"
import {
  getLockFromPm,
  install as _install,
  loadPackageCommands,
  unInstall as _uninstall,
} from "./pm.ts"
import { version } from "./version.ts"

export async function action(pm: PM) {
  const commander = createMainCommander()

  // register package commands
  const packageCommands = await loadPackageCommands()
  if (packageCommands) {
    Object.keys(packageCommands).forEach((ck, index) => {
      const cv = packageCommands[ck]
      const runCommand = new Command().alias(String(index)).description(
        `${gray(cv)}`,
      ).action(() => execa([pm, "run", ck]))
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
      (options, ...deps) => _install(pm, deps, formatOptions(options)),
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
        // empty lock
        if (withLock) {
          const lockPath = await findUp(locks)
          if (lockPath) {
            await Deno.writeFile(lockPath, new Uint8Array())
          }
        }

        // clean cache
        await cleanDirs(
          [
            "dist",
            ...cacheDirs,
            await findUp(["node_modules"]),
          ],
        )
        // reinstall
        await _install(pm)
      },
    )

  const pm_type = new EnumType<PM>(pms)
  const _switch = new Command().alias("switch").description(
    `switch ${brightGreen(pm)} to ${
      pms.filter((p) => p !== pm).map((p) => yellow(p)).join(" or ")
    }`,
  ).type(
    "pm_type",
    pm_type,
  ).arguments("<pm:pm_type>").action(async (_, newPm) => {
    const existedLock = getLockFromPm(pm)
    if (await existsFile(existedLock)) {
      await Deno.remove(existedLock)
    }
    const newLock = getLockFromPm(newPm)
    await ensureFile(newLock)
  })

  const init = new Command().alias("init").description("init new project")
    .type(
      "pm_type",
      pm_type,
    ).arguments("<pm:pm_type>")
    .action(async (_, pm) => {
      const newLock = getLockFromPm(pm)
      const ensureFiles = [ensureFile(newLock)]
      if (!(await existsFile("package.json"))) {
        ensureFiles.push(Deno.writeTextFile("package.json", "{}"))
      }
      await Promise.all(ensureFiles)
    })

  const uninstall = new Command().alias("uninstall").alias("rm").description(
    `${brightGreen(pm)} uninstall deps`,
  ).arguments("<...deps:string>").action((_, ...deps) => _uninstall(pm, deps))

  const clean = new Command().alias("clean").description(
    `clean cache`,
  ).action(() => cleanDirs(cacheDirs))

  await commander
    .command("cl", clean)
    .command("in", init)
    .command("i", install)
    .command("ri", reinstall)
    .command("un", uninstall)
    .command("sw", _switch)
    .parse(Deno.args)
}

export async function denoAction() {
  const commander = createMainCommander()

  const path = await findUpDenoConfigFile()

  // register task commands
  const packageCommands = await loadPackageCommands(path!, "tasks")

  if (packageCommands) {
    Object.keys(packageCommands).forEach((ck, index) => {
      const cv = packageCommands[ck]
      const runCommand = new Command().alias(String(index)).description(
        `${gray(cv)}`,
      ).action(() =>
        execa(["deno", "task", ck]).catch(() => console.log("hello"))
      )
      commander.command(ck, runCommand)
    })
  }

  await commander.parse(Deno.args)
}

function createMainCommander() {
  return new Command()
    .name("n")
    .version(version)
    .description(
      `Command line tool created by deno to manage js rumtime projects`,
    )
}

function formatOptions(originOptions: Record<string, string | boolean>) {
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
    if (o.startsWith("-")) {
      return o
    }
    return `--${paramCase(o)}`
  })
}
