import { which } from "https://deno.land/x/which@0.2.2/mod.ts";
import { cyan, red, yellow } from "https://deno.land/std@0.180.0/fmt/colors.ts";

export async function execa(cmd: string[]) {
  const command = await which(cmd.shift()!);

  const process = Deno.run({
    cmd: [command!, ...cmd],
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
  });

  // watch ctrl + c
  Deno.addSignalListener("SIGINT", () => {
    console.log(
      `❎ The task was ${yellow("manually interrupted")}`,
    );
    Deno.kill(process.pid);
    Deno.close(process.rid);
    Deno.exit(128 + 2);
  });

  const { success, code } = await process.status();

  process.close();

  if (!success) {
    console.log(`❎ ${red("Task execution failed")}`);
    Deno.exit(code);
  }
}

export function normalFusing() {
  console.log(`🥰 all right, ${cyan("have a good time!!")}`);
  Deno.exit(0);
}
