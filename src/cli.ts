import {
  brightGreen,
  brightYellow,
  dim,
  gray,
  red,
  yellow,
} from "https://deno.land/std@0.209.0/fmt/colors.ts"
import { ensureFile } from "https://deno.land/std@0.209.0/fs/ensure_file.ts"
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/command.ts"
import { EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/types/enum.ts"

import { resolve } from "https://deno.land/std@0.209.0/path/resolve.ts"
import paramCase from "https://deno.land/x/case@2.2.0/paramCase.ts"
import { cacheDirs, description } from "./constant.ts"
import { cleanWorkspaces, existsFile } from "./fs.ts"
import { getLockFromPm, nodePms, type PmType, usePm } from "./pm.ts"
import { execa } from "./process.ts"
import { version } from "./version.ts"

export async function action() {
  const pm = usePm()
  const commander = createMainCommander()

  interface PackageCommandOptions {
    install?: boolean
    reinstall?: boolean
  }

  registerScripts({
    commander,
    resolveOptions(command) {
      command.option("-i, --install", "with install")
      command.option("-r, --reinstall", "with reinstall", {
        conflicts: [`install`],
      })
    },
    async action(key, cwd, options: PackageCommandOptions) {
      if (options.install) {
        await pm.install()
      }
      if (options.reinstall) {
        // clean cache and node_modules
        await cleanWorkspaces(pm.workspaces, [...cacheDirs, "node_modules"])
        // reinstall
        await pm.install()
      }
      return execa([pm.type, "run", key], cwd)
    },
  })

  const install = new Command()
    .alias("install")
    .description(`${brightGreen(pm.type)} install deps`)
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
    .option("-f, --force", "force install deps")
    .arguments("[...deps:string]")
    .action(
      (options, ...deps) => pm.install(deps, formatOptions(options)),
    )

  const reinstall = new Command().alias("reinstall")
    .description(`${brightGreen(pm.type)} reinstall deps`).option(
      "-w, --withLock",
      "with lock",
      {
        default: false,
      },
    ).action(
      async ({ withLock }) => {
        // empty lock
        if (withLock && pm.lockFile) {
          await Deno.writeFile(pm.lockFile, new Uint8Array())
        }

        // clean cache and node_modules
        await cleanWorkspaces(pm.workspaces, [...cacheDirs, "node_modules"])

        // reinstall
        await pm.install()
      },
    )

  const pm_type = new EnumType<PmType>(nodePms)
  const _switch = new Command().alias("switch").description(
    `switch ${brightGreen(pm.type)} to ${
      nodePms.filter((p) => p !== pm.type).map((p) => yellow(p)).join(" or ")
    }`,
  ).type(
    "pm_type",
    pm_type,
  ).arguments("<pm:pm_type>").action(async (_, newPm) => {
    if (pm.lockFile) {
      await Deno.remove(pm.lockFile)
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
      await Promise.all([ensureFile(newLock), initPackageJson()])

      async function initPackageJson() {
        if (!await existsFile("package.json")) {
          return initFile()
        }
        const packageText = await Deno.readTextFile("package.json")

        const packageJsonEmpty = packageText.length === 0

        if (packageJsonEmpty) {
          return initFile()
        }

        try {
          JSON.parse(packageText)
        } catch (error) {
          console.log(`parse error -> ${red(resolve("package.json"))}`)
          console.log(error)
        }

        async function initFile() {
          await Deno.writeTextFile("package.json", "{}")
        }
      }
    })

  const uninstall = new Command().alias("uninstall").alias("rm").description(
    `${brightGreen(pm.type)} uninstall deps`,
  ).arguments("<...deps:string>").action((_, ...deps) => pm.uninstall(deps))

  const clean = new Command().alias("clean").description(`clean cache`).action(
    () => cleanWorkspaces(pm.workspaces, cacheDirs),
  )

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

  registerScripts({
    commander,
    action(key, cwd) {
      return execa(["deno", "task", key], cwd)
    },
  })

  await commander.parse(Deno.args)
}

function createMainCommander() {
  return new Command()
    .name("n")
    .version(version)
    .description(description)
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

interface ScriptsOptions {
  commander: Command
  resolveOptions?: (command: Command) => unknown
  action(key: string, cwd: string, options: unknown): unknown
}

function registerScripts(
  options: ScriptsOptions,
) {
  const pm = usePm()
  const { commander, action, resolveOptions = () => {} } = options
  for (let i = 0; i < pm.scripts.length; i++) {
    const script = pm.scripts[i]
    const isRoot = pm.workspaces[0] === script.cwd

    const description = isRoot
      ? `${gray(script.value)}`
      : `${gray(script.value)} ${dim(yellow(`→ ${script.relativedWorkspace}`))}`
    const runCommand = new Command().alias(String(i))

    runCommand.description(description)

    resolveOptions(runCommand)

    runCommand.action((options) => action(script.key, script.cwd, options))

    commander.command(script.magicKey, runCommand)
  }
}
