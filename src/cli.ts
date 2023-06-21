import {
  brightGreen,
  brightYellow,
  gray,
  yellow,
} from "https://deno.land/std@0.192.0/fmt/colors.ts"
import { emptyDir } from "https://deno.land/std@0.192.0/fs/empty_dir.ts"
import { ensureFile } from "https://deno.land/std@0.192.0/fs/ensure_file.ts"
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/command.ts"
import { EnumType } from "https://deno.land/x/cliffy@v0.25.7/command/types/enum.ts"
import { execa } from "https://deno.land/x/easy_std@v0.4.1/src/process.ts"

import { type PM, pmLock, pms } from "./constant.ts"
import { existsFile, findUp } from "./fs.ts"
import {
  getPackageCommands,
  install as _install,
  unInstall as _uninstall,
} from "./pm.ts"
import { version } from "./version.ts"

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
    return o
  })
}

export async function action(currentPM: PM) {
  const commander = new Command()
    .name("n")
    .version(version)
    .description(`Command line tool created by deno to manage node projects`)

  const packageCommands = await getPackageCommands()
  if (packageCommands) {
    Object.keys(packageCommands).forEach((ck) => {
      const cv = packageCommands[ck]
      const runCommand = new Command().description(
        `${gray(cv)}`,
      ).action(() => execa([currentPM, "run", ck]))
      commander.command(ck, runCommand)
    })
  }

  const install = new Command()
    .alias("install")
    .description(`${brightGreen(currentPM)} install deps`)
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
      (options, ...deps) => _install(currentPM, deps, formatOptions(options)),
    )

  const reinstall = new Command().alias("reinstall")
    .description(`${brightGreen(currentPM)} reinstall deps`).option(
      "-w, --withLock",
      "with lock",
      {
        default: false,
      },
    ).action(
      async ({ withLock }) => {
        if (withLock) {
          const lock = await findUp(Object.values(pmLock))
          if (lock) {
            await Deno.remove(lock)
          }
        }

        const node_modules_path = await findUp(["node_modules"])
        if (node_modules_path) {
          await emptyDir(node_modules_path)
          console.log(
            `\n${brightGreen("√ clean")} ${gray(node_modules_path)} \n`,
          )
        }
        await _install(currentPM)
      },
    )

  const pm_type = new EnumType<PM>(pms)
  const _switch = new Command().alias("switch").description(
    `switch ${brightGreen(currentPM)} to ${
      pms.filter((p) => p !== currentPM).map((p) => yellow(p)).join(" or ")
    }`,
  ).type(
    "pm_type",
    pm_type,
  ).arguments("<pm:pm_type>").action(async (_, pm) => {
    const existedLock = pmLock[currentPM]
    if (await existsFile(existedLock)) {
      await Deno.remove(existedLock)
    }
    const newLock = pmLock[pm]
    await ensureFile(newLock)
  })

  const init = new Command().alias("init").description("init new project")
    .type(
      "pm_type",
      pm_type,
    ).arguments("<pm:pm_type>")
    .action(async (_, pm) => {
      const newLock = pmLock[pm]
      const ensureFiles = [ensureFile(newLock)]
      if (!(await existsFile("package.json"))) {
        ensureFiles.push(Deno.writeTextFile("package.json", "{}"))
      }
      await Promise.all(ensureFiles)
    })

  const uninstall = new Command().alias("uninstall").alias("rm").description(
    `${brightGreen(currentPM)} uninstall deps`,
  ).arguments("<...deps:string>").action((_, ...deps) =>
    _uninstall(currentPM, deps)
  )

  await commander
    .command("in", init)
    .command("i", install)
    .command("ri", reinstall)
    .command("un", uninstall)
    .command("sw", _switch)
    .parse(Deno.args)
}
