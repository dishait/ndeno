import { exist } from "./fs.ts";
import { builtinModules as _builtinModules } from "node:module";
import { walk } from "https://deno.land/std@0.179.0/fs/walk.ts";
import { join } from "https://deno.land/std@0.179.0/path/mod.ts";

export const builtinModules = [
  "module",
  "node:module",
  ..._builtinModules,
  ..._builtinModules.map((m: string) => `node:${m}`),
];

export function isBuiltin(specifier: string) {
  return builtinModules.includes(specifier);
}

export function uniqueDeps(...depsArray: string[][]) {
  return Array.from(new Set(depsArray.flat()));
}

export function extractSpecifier(code: string) {
  return code.match(
    /(?<=(import\(|require\(|from\s+)["']).*(?=["'])/g,
  ) || [];
}

export function eliminateComments(code: string) {
  return code.replace(/\/\/.*/g, "").replace(/\/\*.*?\*\//g, "");
}

export function filterDeps(specifiers: string[]) {
  return specifiers.filter((specifier) =>
    !specifier.startsWith(".") && !isBuiltin(specifier) &&
    !specifier.startsWith("node:")
  ).map((specifier) => specifier.replace(/\/.*/, ""));
}

export async function readCodes(path: string) {
  const options = {
    includeFiles: true,
    includeDirs: false,
    followSymlinks: true,
    exts: [".ts", ".js", ".tsx", ".jsx", ".vue"],
    skip: [/node_modules/g, /dist/g, /output/g, /.nuxt/g],
  };
  const codes: string[] = [];

  for await (const entry of walk(path, options)) {
    const code = await Deno.readTextFile(entry.path);
    codes.push(code);
  }

  return codes;
}

export async function extractDeps(path: string) {
  const codes = await readCodes(path);

  const deps = codes.map((code) =>
    filterDeps(extractSpecifier(eliminateComments(code)))
  );

  return uniqueDeps(...deps);
}

export async function extractDepsFromPackageJson(path: string) {
  const packageJson = join(path, "package.json");
  if (!exist(packageJson)) {
    return [];
  }
  const packageJsonText = await Deno.readTextFile(packageJson);

  const packageJsonObject = JSON.parse(packageJsonText);

  const devDeps = Object.keys(packageJsonObject["devDependencies"] ?? {});

  const deps = Object.keys(packageJsonObject["dependencies"] ?? {});

  return uniqueDeps(deps, devDeps);
}
