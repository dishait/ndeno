import { green } from "https://deno.land/std@0.178.0/fmt/colors.ts";

export function listLog(list: string[], color = green) {
  const endIndex = list.length - 1;
  return list.reduce((s, v, i) => {
    if (i === endIndex) {
      s += ` └─ ${color(v)}`;
    } else {
      s += ` ├─ ${color(v)}\n`;
    }

    return s;
  }, "");
}
