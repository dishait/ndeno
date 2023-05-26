export { dirname, join } from "https://deno.land/std@0.189.0/path/mod.ts"

export function slash(path: string) {
  return path.replace(/\\/g, "/")
}
