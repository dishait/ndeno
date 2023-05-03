import { builtinModules as _builtinModules } from "node:module"

import { exist, walk } from "./fs.ts"

export const BUILTIN_MODULES = [
  "module",
  "node:module",
  ..._builtinModules,
  ..._builtinModules.map((m: string) => `node:${m}`),
]

export function isBuiltin(specifier: string) {
  return BUILTIN_MODULES.includes(specifier)
}

export function uniqueDeps(...depsArray: string[][]) {
  return Array.from(new Set(depsArray.flat()))
}

const dynamicSpecifiersReg = /(?<=(import|require)\( *?(['"]))\w*?(?=\2)/g
const staticSpecifiersReg = /(?<=(import|from) *?(["']))\w*?(?=\2)/g

export function extractSpecifier(code: string) {
  const dynamicSpecifiers = code.match(dynamicSpecifiersReg) || []
  const staticSpecifiers = code.match(staticSpecifiersReg) || []
  return [...dynamicSpecifiers, ...staticSpecifiers]
}

export function eliminateComments(code: string) {
  return code.replace(/\/\/.*|\/\*.*?\*\//g, "")
}

const effectiveSpecifierReg = /^\w|@/

export function filterDeps(specifiers: string[]) {
  return specifiers
    .filter(
      (specifier) =>
        effectiveSpecifierReg.test(specifier) &&
        !isBuiltin(specifier) &&
        !specifier.startsWith("node:"),
    )
    .map((specifier) => {
      if (specifier.startsWith("@")) {
        const [organization, pkg] = specifier.split("/")
        return `${organization}/${pkg}`
      }
      return specifier.replace(/\/.*/, "")
    })
}

export async function readCodes(base: string) {
  const options = {
    includeFiles: true,
    includeDirs: false,
    followSymlinks: true,
    exts: [".ts", ".js", ".tsx", ".jsx", ".vue"],
    skip: [/node_modules/g, /dist/g, /.output/g, /.nuxt/g],
  }
  const codes: string[] = []

  for await (const entry of walk(base, options)) {
    const code = await Deno.readTextFile(entry.path)
    codes.push(code)
  }

  return codes
}

export async function extractDeps(base: string) {
  const codes = await readCodes(base)

  const deps = codes.map((code) =>
    filterDeps(extractSpecifier(eliminateComments(code)))
  )

  return uniqueDeps(...deps)
}

export async function extractDepsFromPackageJson(packageJsonPath: string) {
  if (!(await exist(packageJsonPath))) {
    return []
  }
  const packageJsonText = await Deno.readTextFile(packageJsonPath)

  const packageJsonObject = JSON.parse(packageJsonText)

  const devDeps = Object.keys(packageJsonObject["devDependencies"] ?? {})

  const deps = Object.keys(packageJsonObject["dependencies"] ?? {})

  return uniqueDeps(deps, devDeps)
}
