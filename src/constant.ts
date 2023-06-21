export enum pmLock {
  yarn = "yarn.lock",
  pnpm = "pnpm-lock.yaml",
  npm = "package-lock.json",
}

export enum lockPM {
  "yarn.lock" = "yarn",

  "pnpm-lock.yaml" = "pnpm",
  "package-lock.json" = "npm",
}

export const pms = ["npm", "pnpm", "yarn"] as const

export type PM = keyof typeof pmLock
