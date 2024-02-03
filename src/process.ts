import { runtime } from "npm:std-env@3.7.0"
import { execa as denoExeca } from "https://deno.land/x/easy_std@v0.7.0/src/process.ts"

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
