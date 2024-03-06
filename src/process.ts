import { denoExeca, runtime } from "./deps.ts"

export async function execa(cmd: string[], cwd?: string) {
  if (runtime === "deno") {
    return denoExeca(cmd, { cwd })
  }
  const { execa: nodeExeca } = await import("npm:execa@8.0.1")
  return nodeExeca(cmd.shift() as string, cmd, {
    cwd,
    stdio: "inherit",
  })
}
