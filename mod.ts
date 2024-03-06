import { initPm, usePm } from "./src/pm.ts"

async function runMain() {
  await initPm()
  const pm = usePm()

  if (pm.type === "deno") {
    const { denoAction } = await import("./src/cli.ts")
    await denoAction()
    Deno.exit(0)
  }

  if (Deno.args.length === 0) {
    await pm.install()
    Deno.exit(0)
  }

  const { action } = await import("./src/cli.ts")
  await action()
}

if (import.meta.main) {
  runMain()
}
