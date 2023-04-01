import { green } from "https://deno.land/std@0.182.0/fmt/colors.ts";

export function listLog(list: string[], color = green) {
  return list.reduce((s, v, i) => {
    s += `${i === list.length - 1 ? " └─ " : " ├─ "}${color(v)}${
      i === list.length - 1 ? "" : "\n"
    }`;
    return s;
  }, "");
}
