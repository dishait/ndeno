import { runtime } from "npm:std-env@3.7.0"
import { execa as nodeExeca } from "npm:execa@8.0.1"
import { execa as denoExeca } from "https://deno.land/x/easy_std@v0.7.0/src/process.ts"

export function execa(cmd: string[]) {
  if (runtime === "deno") {
    return denoExeca(cmd)
  }
  return nodeExeca(cmd.shift() as string, cmd, {
    stdio: 'inherit'
  })
}
