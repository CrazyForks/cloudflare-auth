#!/usr/bin/env node
import { runCli } from "@cf-auth/cli";

void runCli(["init", ...process.argv.slice(2)]);
