import { execa } from "./src/deps.ts"

const versionFile = "./src/version.ts"

const versionFileText = await Deno.readTextFile(versionFile)

const [oldVersion] = versionFileText.match(/(?<=version = ").*(?=")/) ||
  ["0.0.0"]

const [major, minor, patch] = oldVersion.split(".")

const newVersion = prompt(
  "🎉 input new version",
  `${major}.${minor}.${Number(patch) + 1}`,
)

await Deno.writeTextFile(
  versionFile,
  `export const version = "${newVersion}"`,
)

await execa(["git", "add", "."])

await execa(["git", "commit", "-m", `chore: update version to v${newVersion}`])

await execa(["git", "tag", `v${newVersion}`])

await execa(["git", "push"])

await execa(["git", "push", "--tags"])
