import { green } from "./color.ts"

export function listLog(list: string[], color = green) {
  return list.reduce((s, v, i) => {
    s += `${i === list.length - 1 ? " └─ " : " ├─ "}${color(v)}${
      i === list.length - 1 ? "" : "\n"
    }`
    return s
  }, "")
}
