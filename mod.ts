import { install } from "./src/pm.ts"
import { detectPackageManager } from "./src/pm.ts"

if (import.meta.main) {
  const { args } = Deno

  const pm = await detectPackageManager()

  if (args.length === 0) {
    await install(pm)
    Deno.exit(0)
  }

  const { action } = await import("./src/cli.ts")

  await action(pm)
}
