import { dirname } from "./deps.ts"

export function slash(path: string) {
  return path.replace(/\\/g, "/")
}

export function createFindUpPaths(base: string) {
  base = slash(base)
  const paths = [base]
  let total = base.split("/").length - 1
  while (total) {
    base = dirname(base)
    paths.push(base)
    total--
  }
  return paths
}
