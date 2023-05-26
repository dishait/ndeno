import { exists } from "https://deno.land/std@0.189.0/fs/exists.ts"

import { dirname, join, slash } from "./path.ts"

export { walk } from "https://deno.land/std@0.189.0/fs/walk.ts"
export { exists } from "https://deno.land/std@0.189.0/fs/exists.ts"

export function createFindUp(target: string) {
  return async function (base: string) {
    base = slash(base)
    const paths = [join(base, target)]
    let total = base.split("/").length - 1
    while (total) {
      base = dirname(base)
      paths.push(join(base, target))
      total--
    }

    for (const path of paths) {
      if (await exists(path)) {
        return path
      }
    }
    return null
  }
}

export const findUpNodeModules = createFindUp("node_modules")
export const findUpPackageJson = createFindUp("package.json")
