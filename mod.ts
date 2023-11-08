import { basename } from "https://deno.land/std@0.205.0/path/mod.ts"

import { lockPM, type PM, pmLock } from "./src/constant.ts"
import { findUp } from "./src/fs.ts"
import { install } from "./src/pm.ts"

if (import.meta.main) {
  const { args } = Deno

  const locks = Object.values(pmLock)

  const lock = await findUp(locks)

  const currentPM: PM = !lock ? "npm" : lockPM[basename(lock) as pmLock]

  if (args.length === 0) {
    await install(currentPM)
    Deno.exit(0)
  }

  const { action } = await import("./src/cli.ts")

  await action(currentPM)
}
