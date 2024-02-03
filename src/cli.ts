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
import { execa } from "./process.ts"

import { resolve } from "https://deno.land/std@0.209.0/path/resolve.ts"
import paramCase from "https://deno.land/x/case@2.2.0/paramCase.ts"
import { cacheDirs, description, locks, type PM, pms } from "./constant.ts"
import {
  cleanWorkspaces,
  existsFile,
  findUp,
  findUpDenoConfigFile,
} from "./fs.ts"
import {
  getLockFromPm,
  install as _install,
  loadPackageCommands,
  loadWorkspaces,
  unInstall as _uninstall,
} from "./pm.ts"
import { version } from "./version.ts"
import { join } from "https://deno.land/std@0.212.0/path/join.ts"
import { dirname } from "https://deno.land/std@0.209.0/path/dirname.ts"
import { relative } from "https://deno.land/std@0.209.0/path/relative.ts"
import { slash } from "https://deno.land/x/easy_std@v0.7.0/src/path.ts"

export async function action(pm: PM) {
  const commander = createMainCommander()

  const workspaces = await loadWorkspaces(pm)
  const paths = workspaces.map((w) => join(w, "package.json"))
  // register package commands
  await registerPackageCommands({
    paths,
    commander,
    key: "scripts",
    action(key, cwd) {
      return execa([pm, "run", key], cwd)
    },
  })

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
    .option("-f, --force", "force install deps")
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

        // clean cache and node_modules
        await cleanWorkspaces(pm, [...cacheDirs, "node_modules"])

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
    `${brightGreen(pm)} uninstall deps`,
  ).arguments("<...deps:string>").action((_, ...deps) => _uninstall(pm, deps))

  const clean = new Command().alias("clean").description(
    `clean cache`,
  ).action(() => cleanWorkspaces(pm, cacheDirs))

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
  await registerPackageCommands({
    commander,
    paths: [path!],
    key: "tasks",
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

interface RegisterPackageCommandsOptions {
  paths: string[]
  key: string
  commander: Command

  action(key: string, cwd: string): unknown
}

async function registerPackageCommands(
  options: RegisterPackageCommandsOptions,
) {
  const { paths, key, commander, action } = options

  const root = paths[0]
  const commandSet = new Set<string>()
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    const isRoot = i === 0
    const cwd = dirname(path)
    const packageCommands = await loadPackageCommands(path, key)
    if (packageCommands) {
      const workspace = isRoot ? "" : slash(relative(dirname(root), cwd))
      Object.keys(packageCommands).forEach((ck, index) => {
        const cv = packageCommands[ck]
        const description = isRoot
          ? `${gray(cv)}`
          : `${gray(cv)} ${dim(yellow(`→ ${workspace}`))}`
        const runCommand = new Command().alias(String(index)).description(
          description,
        ).action(() => action(ck, cwd))
        const mck = isRoot ? ck : `${workspace.replaceAll("/", ":")}:${ck}`
        if (commandSet.has(mck)) {
          return
        }
        commander.command(mck, runCommand)
        commandSet.add(mck)
      })
    }
  }
}
