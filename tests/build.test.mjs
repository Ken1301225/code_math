import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, cp, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildSite } from "../scripts/lib/site-builder.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..", "content-examples");

test("buildSite renders homepage, article pages, and listing pages", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "code-math-fixture-"));
  const outputDir = path.join(fixtureRoot, "dist");
  const articlesDir = path.join(fixtureRoot, "articles");

  try {
    await cp(projectRoot, articlesDir, { recursive: true });
    await writeFile(
      path.join(articlesDir, "example-code.md"),
      `---
title: Prefix Sum Walkthrough
slug: prefix-sum-note
date: 2026-03-20
type: code
tags:
  - algorithm
  - prefix-sum
summary: Explain why prefix sums start with a sentinel zero.
links:
  - "[Prefix sum overview](https://en.wikipedia.org/wiki/Prefix_sum)"
---

:::pair id=intro
\`\`\`python
def solve(nums):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
\`\`\`

The sentinel zero makes interval subtraction uniform.

- It removes the first-interval special case.
- It keeps \`prefix[right + 1] - prefix[left]\` universal.

\`\`\`python
answer = prefix[right + 1] - prefix[left]
\`\`\`
:::
`,
      "utf8",
    );
    await writeFile(
      path.join(articlesDir, "empty-note.md"),
      `---
title: Empty Note
slug: empty-note
date: 2026-03-20
type: code
tags:
  - algorithm
---

:::pair id=only
\`\`\`python
print(1)
\`\`\`
:::
`,
      "utf8",
    );

    await buildSite({
      rootDir: fixtureRoot,
      articlesDir,
      outDir: outputDir,
      basePath: "/code_math",
    });

    const homeHtml = await readFile(path.join(outputDir, "index.html"), "utf8");
    const codeHtml = await readFile(
      path.join(outputDir, "articles", "prefix-sum-note", "index.html"),
      "utf8",
    );
    const mathHtml = await readFile(
      path.join(outputDir, "articles", "regret-bound-note", "index.html"),
      "utf8",
    );
    const emptyHtml = await readFile(
      path.join(outputDir, "articles", "empty-note", "index.html"),
      "utf8",
    );
    const typeHtml = await readFile(
      path.join(outputDir, "type", "code", "index.html"),
      "utf8",
    );
    const tagHtml = await readFile(
      path.join(outputDir, "tag", "proof", "index.html"),
      "utf8",
    );

    assert.match(homeHtml, /Prefix Sum Walkthrough/);
    assert.match(homeHtml, /Regret Bound Walkthrough/);
    assert.match(homeHtml, /代码批注/);
    assert.match(homeHtml, /数学证明/);
    assert.match(homeHtml, /class="guide-link guide-link--code"/);
    assert.match(homeHtml, /class="guide-link guide-link--math"/);
    assert.match(homeHtml, /href="\/code_math\/type\/code\/"/);
    assert.match(homeHtml, /href="\/code_math\/type\/math\/"/);

    assert.match(codeHtml, /The sentinel zero makes interval subtraction uniform/);
    assert.match(codeHtml, /data-pair-id="intro"/);
    assert.match(codeHtml, /href="\/code_math\/assets\/css\/site\.css"/);
    assert.match(codeHtml, /src="\/code_math\/assets\/js\/article\.js"/);
    assert.match(codeHtml, /class="article-masthead editorial-panel"/);
    assert.match(codeHtml, /class="article-hero-grid"/);
    assert.doesNotMatch(codeHtml, /class="article-summary-panel"/);
    assert.match(
      codeHtml,
      /<div class="article-heading">\s*<h1>Prefix Sum Walkthrough<\/h1>\s*<p class="article-summary">Explain why prefix sums start with a sentinel zero\.<\/p>/,
    );
    assert.match(codeHtml, /class="[^"]*article-meta-strip[^"]*"/);
    assert.match(codeHtml, /class="article-meta-chip article-meta-chip--links"/);
    assert.match(codeHtml, /href="https:\/\/en\.wikipedia\.org\/wiki\/Prefix_sum"/);
    assert.match(codeHtml, />Prefix sum overview</);
    assert.match(codeHtml, /class="article-chart-stack"/);
    assert.match(codeHtml, /class="article-tag-chart article-tag-chart--pie"/);
    assert.match(codeHtml, /data-tag-name="algorithm"/);
    assert.match(codeHtml, /class="article-ratio-chart article-ratio-chart--split"/);
    assert.match(codeHtml, /class="article-ratio-band"/);
    assert.match(codeHtml, /data-ratio-kind="code"/);
    assert.match(codeHtml, /data-ratio-kind="math"/);
    assert.match(codeHtml, /3 articles/);
    assert.match(codeHtml, /Code<\/span>\s*<span class="article-ratio-value">67%/);
    assert.match(codeHtml, /Math<\/span>\s*<span class="article-ratio-value">33%/);
    assert.match(codeHtml, /class="article-source-panel editorial-panel"/);
    assert.match(codeHtml, /data-note-stack/);
    assert.match(codeHtml, /data-focus-layer/);
    assert.match(codeHtml, /data-focus-card/);
    assert.match(codeHtml, /class="[^"]*pair-unit[^"]*"/);
    assert.match(codeHtml, /class="[^"]*pair-source-segment[^"]*"[^>]*data-lock-target="1"/);
    assert.match(codeHtml, /class="[^"]*pair-note-segment[^"]*"[^>]*data-note-panel/);
    assert.match(codeHtml, /data-pair-index="1"/);
    assert.match(codeHtml, /<code class="language-python"><span class="token token--keyword">def<\/span>/);
    assert.match(codeHtml, /<ul>/);
    assert.match(codeHtml, /<code>prefix\[right \+ 1\] - prefix\[left\]<\/code>/);
    assert.match(codeHtml, /<pre class="code-block code-block--python"><code class="language-python">/);

    assert.match(mathHtml, /gradient penalty term/);
    assert.match(mathHtml, /katex/);
    assert.match(mathHtml, /href="\/code_math\/assets\/css\/site\.css"/);
    assert.match(mathHtml, /href="\/code_math\/assets\/vendor\/katex\/katex\.min\.css"/);
    assert.match(mathHtml, /class="[^"]*pair-source-segment--math[^"]*"/);
    assert.match(mathHtml, /class="article-chart-stack"/);
    assert.match(mathHtml, /class="article-tag-chart article-tag-chart--pie"/);
    assert.match(mathHtml, /class="article-ratio-chart article-ratio-chart--split"/);
    assert.match(mathHtml, /3 articles/);

    assert.match(emptyHtml, /token token--builtin">print/);
    assert.doesNotMatch(emptyHtml, /data-note-panel/);
    assert.doesNotMatch(emptyHtml, /data-lock-target="1" id="only"/);

    assert.match(typeHtml, /Prefix Sum Walkthrough/);
    assert.match(tagHtml, /Regret Bound Walkthrough/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
