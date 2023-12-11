import { brightGreen, gray } from "https://deno.land/std@0.208.0/fmt/colors.ts"
import { slash } from "https://deno.land/x/easy_std@v0.6.0/src/path.ts"

export function logClean(dir: string) {
  console.log(
    `${brightGreen("√ clean")} ${gray(slash(dir))}`,
  )
}
