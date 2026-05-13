import { performance } from "node:perf_hooks";

import type { PasswordHashProfileName } from "../packages/core/src/index.js";
import { hashPassword } from "../packages/core/src/index.js";

const profile = parseProfile(process.argv);
const samples: number[] = [];
for (let i = 0; i < 3; i += 1) {
  await hashPassword("benchmark password", { profile });
}
for (let i = 0; i < 10; i += 1) {
  const started = performance.now();
  await hashPassword("benchmark password", { profile });
  samples.push(performance.now() - started);
}

samples.sort((a, b) => a - b);
const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0;
const p95 = samples[Math.floor(samples.length * 0.95)] ?? samples.at(-1) ?? 0;
console.log(
  JSON.stringify(
    {
      profile,
      p50Ms: Math.round(p50),
      p95Ms: Math.round(p95),
    },
    null,
    2,
  ),
);

function parseProfile(args: string[]): PasswordHashProfileName {
  const index = args.indexOf("--profile");
  const value = index === -1 ? "workers-balanced" : args[index + 1];
  if (
    value === "development-fast" ||
    value === "workers-balanced" ||
    value === "high-cost"
  ) {
    return value;
  }
  throw new Error(
    "Usage: pnpm benchmark:password -- --profile <development-fast|workers-balanced|high-cost>",
  );
}
