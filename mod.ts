import { emptyDir } from "https://deno.land/std@0.189.0/fs/empty_dir.ts"
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts"

import { brightGreen, brightYellow, gray } from "./src/color.ts"
import {
  findUpDetectPM,
  findUpNodeModulesPath,
  getPackageCommands,
} from "./src/pm.ts"
import { execa, execaInstall } from "./src/process.ts"

interface Options {
  global?: true
  dir?: string
  prod?: true
  dev?: true
  recursive: boolean
}

function formatOptions(originOptions: Options) {
  const options = Object.keys(originOptions).filter((k) => {
    if (typeof k === "boolean") {
      return k
    }
    return false
  }).map((k) => `--${k}`)

  if (originOptions.dir) {
    options.push(`--dir=${originOptions.dir}`)
  }

  return options
}

if (import.meta.main) {
  const pm = await findUpDetectPM()

  const commander = new Command()
    .name("n")
    .version("1.0.0")
    .description(`Command line tool created by deno to manage node projects`)
    .action(async () => {
      await execaInstall(pm, [], [])
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
      "-P, --prod",
      `Packages in ${brightYellow(`devDependencies`)} won't be installed`,
    )
    .option(
      "-D, --dev",
      `Only ${
        brightYellow(`devDependencies`)
      } are installed regardless of the ${brightGreen(`NODE_ENV`)}`,
    )
    .option(
      "-r, --recursive",
      `Run the command for each project in the workspace ${
        brightYellow("(only pnpm)")
      }`,
      { default: true },
    )
    .arguments("[...deps:string]")
    .action(
      async (options, ...deps) => {
        await execaInstall(pm, formatOptions(options), deps)
      },
    )

  const reinstall = new Command().alias("reinstall")
    .description(
      `${brightGreen(pm)} reinstall deps`,
    ).option("-g, --global", "Global installation")
    .option("-C, --dir <dir:string>", "Change to directory <dir>")
    .option(
      "-P, --prod",
      `Packages in ${brightYellow(`devDependencies`)} won't be installed`,
    )
    .option(
      "-D, --dev",
      `Only ${
        brightYellow(`devDependencies`)
      } are installed regardless of the ${brightGreen(`NODE_ENV`)}`,
    )
    .option(
      "-r, --recursive",
      `Run the command for each project in the workspace ${
        brightYellow("(only pnpm)")
      }`,
      { default: true },
    )
    .arguments("[...deps:string]").action(async (options, ...deps) => {
      const node_modules_path = await findUpNodeModulesPath()
      if (node_modules_path) {
        await emptyDir(node_modules_path)
        console.log(`\n${brightGreen("√ clean")} ${gray(node_modules_path)} \n`)
      }
      const pm = await findUpDetectPM()
      await execaInstall(pm, formatOptions(options), deps)
    })

  await commander
    .command("i", install)
    .command(
      "ri",
      reinstall,
    )
    .parse(Deno.args)
}
