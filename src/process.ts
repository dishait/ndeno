import { which } from "https://deno.land/x/which@0.2.2/mod.ts";
import { cyan, red, yellow } from "https://deno.land/std@0.182.0/fmt/colors.ts";

export async function execa(cmd: string[]) {
  const command = await which(cmd.shift()!);

  const process = Deno.run({
    cmd: [command!, ...cmd],
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
  });

  function childExit() {
    Deno.close(process.rid);
    // No need to manually pass in signo
    Deno.kill(process.pid);
  }

  // watch ctrl + c
  Deno.addSignalListener("SIGINT", () => {
    console.log(
      `❎ The task was ${yellow("manually interrupted")}`,
    );

    childExit();
    Deno.exit(130);
  });

  // Prevent accidental exit
  globalThis.addEventListener("error", () => {
    childExit();
  });

  globalThis.addEventListener("unhandledrejection", () => {
    childExit();
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
