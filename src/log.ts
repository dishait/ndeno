import { brightGreen, gray } from "https://deno.land/std@0.206.0/fmt/colors.ts"
import { slash } from "https://deno.land/x/easy_std@v0.5.3/src/path.ts"

export function logClean(dir: string) {
  console.log(
    `${brightGreen("√ clean")} ${gray(slash(dir))}`,
  )
}
