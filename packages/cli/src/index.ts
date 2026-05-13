#!/usr/bin/env node
export const cliPackageName = "@cf-auth/cli";

export async function runCli(args = process.argv.slice(2)): Promise<void> {
  const command = args[0] ?? "help";
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(
      "cf-auth <init|migrate|doctor|deploy|generate|clean|rotate-secret>",
    );
    return;
  }
  console.log(`cf-auth ${command} is not implemented yet.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void runCli();
}
