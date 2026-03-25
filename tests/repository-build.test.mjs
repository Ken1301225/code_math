import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildSite } from "../scripts/lib/site-builder.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");

test("buildSite succeeds for checked-in repository articles", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "code-math-repo-build-"));

  try {
    await buildSite({
      rootDir: repoRoot,
      outDir: outputDir,
      basePath: "/code_math",
    });
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
