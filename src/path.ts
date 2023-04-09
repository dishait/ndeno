export { dirname, join } from "https://deno.land/std@0.182.0/path/mod.ts"

export function slash(path: string) {
  return path.replace(/\\/g, "/")
}
