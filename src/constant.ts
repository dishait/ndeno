export type PM = "npm" | "pnpm" | "yarn"
export const pms = ["npm", "pnpm", "yarn"] as const

export const locks = ["pnpm-lock.yaml", "yarn.lock", "package-lock.json"]

export const cacheDirs = [
  ".nuxt",
  ".output",
  ".nitro",
  "cache",
  "@cache",
  "temp",
  ".cache",
  "docs/.vitepress/cache",
]

export const denoConfigFiles = ["deno.json", "deno.jsonc"]
