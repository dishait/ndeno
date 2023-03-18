import { slash } from "./path.ts";
import { dirname, join } from "https://deno.land/std@0.180.0/path/mod.ts";

export async function exist(path: string) {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

export function createFindUp(target: string) {
  return async function(base: string) {
    base = slash(base);
    const paths = [join(base, target)];
    let total = base.split("/").length - 1;
    while (total) {
      base = dirname(base);
      paths.push(join(base, target));
      total--;
    }

    for (const path of paths) {
      if (await exist(path)) {
        return path;
      }
    }
    return null;
  };
}

export const findUpNodeModules = createFindUp("node_modules");
export const findUpPackageJson = createFindUp("package.json");
