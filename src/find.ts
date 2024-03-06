import { createUpBases, exists, join, resolve, slash } from "./deps.ts"

export function existsFile(path: string) {
  return exists(path, {
    isFile: true,
    isDirectory: false,
  })
}

export async function findUp(files: string[], root = Deno.cwd()) {
  const upPaths = createUpBases(root)
  for (const upPath of upPaths) {
    for (const file of files) {
      const path = join(upPath, file)
      if (await exists(path)) {
        return slash(path)
      }
    }
  }
  return null
}

export async function find(files: string[], root = Deno.cwd()) {
  for (const file of files) {
    const resolvedFile = resolve(root, file)
    if (await existsFile(file)) {
      return resolvedFile
    }
  }
  return null
}
