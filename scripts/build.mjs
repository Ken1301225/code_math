#!/usr/bin/env node
import { buildSite } from "./lib/site-builder.mjs";

try {
  await buildSite({
    rootDir: process.cwd(),
  });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
