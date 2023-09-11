import { brightGreen, gray } from "https://deno.land/std@0.201.0/fmt/colors.ts"

export function logClean(dir: string) {
  console.log(
    `${brightGreen("√ clean")} ${gray(dir)}`,
  )
}
