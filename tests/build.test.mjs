import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, cp, writeFile, mkdir } from "node:fs/promises";
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
    await mkdir(path.join(articlesDir, "code", "project-a"), { recursive: true });
    await writeFile(
      path.join(articlesDir, "code", "project-a", "nested-note.md"),
      `---
title: Nested Project Note
slug: nested-note
date: 2026-03-19
type: code
tags:
  - project-a
summary: A nested article route for project grouping.
---

:::pair id=nested
\`\`\`python
value = 42
\`\`\`

Nested routing should preserve grouped article organization.
:::
`,
      "utf8",
    );
    await mkdir(path.join(articlesDir, "sparsegpt"), { recursive: true });
    await writeFile(
      path.join(articlesDir, "sparsegpt", "sparsegpt.md"),
      `---
title: sparsegpt核心代码解析
slug: sparsegpt/sparsegpt.py
date: 2026-03-20
type: code
tags:
  - "#code/prune"
summary: sparsegpt nested slug routing should stay readable.
---

:::pair id=core
\`\`\`python
value = 1
\`\`\`

This route should not contain %2F in the output path.

这里是做了滑动累计: 对于多个<span style="text-decoration: underline wavy;">sample的数据</span>行平均处理得到
$$\\begin{align}
H &= \\frac{2}{N}\\sum_i X_i X_i^T \\\\
&= \\frac{n}{N} H_{old} + \\frac{2}{N}XX^T
\\end{align}
$$
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
    const siteCss = await readFile(path.join(outputDir, "assets", "css", "site.css"), "utf8");
    const articleJs = await readFile(path.join(outputDir, "assets", "js", "article.js"), "utf8");
    const focusLogicJs = await readFile(
      path.join(outputDir, "assets", "js", "article-focus-logic.js"),
      "utf8",
    );
    const hackFont = await readFile(
      path.join(outputDir, "assets", "fonts", "HackNerdFont-Regular.ttf"),
    );
    const wenkaiFont = await readFile(
      path.join(outputDir, "assets", "fonts", "LXGWWenKai.ttf"),
    );
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
    const nestedHtml = await readFile(
      path.join(outputDir, "articles", "code", "project-a", "nested-note", "index.html"),
      "utf8",
    );
    const sparseHtml = await readFile(
      path.join(outputDir, "articles", "sparsegpt", "sparsegpt.py", "index.html"),
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
    assert.match(homeHtml, /class="site-heading"/);
    assert.match(homeHtml, /class="site-metrics-grid"/);
    assert.match(homeHtml, /class="stat-panel project-map-panel"/);
    assert.match(homeHtml, /class="project-map-cell"/);
    assert.match(homeHtml, /class="stat-panel tag-spectrum-panel"/);
    assert.match(homeHtml, /class="stat-panel activity-panel"/);
    assert.match(homeHtml, /class="archive-board"/);
    assert.match(homeHtml, /class="archive-density-chart"/);
    assert.match(homeHtml, /data-project-name="root"/);
    assert.match(homeHtml, /data-project-name="sparsegpt"/);
    assert.doesNotMatch(homeHtml, /class="site-ledger"/);
    assert.match(homeHtml, /class="guide-strip"/);
    assert.match(homeHtml, /class="guide-link guide-link--code"/);
    assert.match(homeHtml, /class="guide-link guide-link--math"/);
    assert.match(homeHtml, /class="guide-glyph guide-glyph--code"/);
    assert.match(homeHtml, /class="guide-glyph guide-glyph--math"/);
    assert.match(homeHtml, /aria-label="Code"/);
    assert.match(homeHtml, /aria-label="Math"/);
    assert.doesNotMatch(homeHtml, /代码批注/);
    assert.doesNotMatch(homeHtml, /数学证明/);
    assert.match(homeHtml, /guide-link--code[\s\S]*?guide-glyph--code[\s\S]*?<\/span>\s*<\/a>/);
    assert.match(homeHtml, /guide-link--math[\s\S]*?guide-glyph--math[\s\S]*?<\/span>\s*<\/a>/);
    assert.match(homeHtml, /href="\/code_math\/type\/code\/"/);
    assert.match(homeHtml, /href="\/code_math\/type\/math\/"/);
    assert.match(siteCss, /@font-face/);
    assert.match(siteCss, /font-display: swap/);
    assert.match(siteCss, /unicode-range:/);
    assert.match(siteCss, /font-family: "LXGW WenKai"/);
    assert.match(siteCss, /font-family: "Hack Nerd Font"/);
    assert.match(siteCss, /\.site-metrics-grid/);
    assert.match(siteCss, /\.project-map-panel/);
    assert.match(siteCss, /\.archive-board/);
    assert.match(articleJs, /function findCenteredPair/);
    assert.match(articleJs, /function scheduleAutoFocus/);
    assert.match(articleJs, /pickAutoFocusIndex/);
    assert.match(articleJs, /let lastScrollY = window\.scrollY/);
    assert.match(articleJs, /scrollDirection,/);
    assert.doesNotMatch(articleJs, /function isNearPageBottom/);
    assert.doesNotMatch(articleJs, /function findLastVisiblePair/);
    assert.doesNotMatch(articleJs, /style\.minHeight/);
    assert.doesNotMatch(articleJs, /lockedPair/);
    assert.doesNotMatch(articleJs, /toggleFocus/);
    assert.doesNotMatch(articleJs, /hashchange/);
    assert.match(focusLogicJs, /export function pickAutoFocusIndex/);
    assert.match(siteCss, /\.pair-stream\.is-hidden\s*\{[^}]*visibility:\s*hidden/);
    assert.doesNotMatch(siteCss, /\.pair-stream\.is-hidden\s*\{[^}]*display:\s*none/);
    assert.match(siteCss, /\.source-stream\s*\{[^}]*padding-bottom:\s*clamp\(220px,\s*34vh,\s*360px\)/);
    assert.match(siteCss, /\.focus-note-layer/);
    assert.match(siteCss, /\.focus-note-card/);
    assert.match(siteCss, /transform:\s*translate3d\(0,\s*var\(--focus-offset,\s*0px\),\s*0\)/);
    assert.ok(hackFont.length > 0);
    assert.ok(wenkaiFont.length > 0);

    assert.match(codeHtml, /The sentinel zero makes interval subtraction uniform/);
    assert.match(codeHtml, /data-pair-id="intro"/);
    assert.match(codeHtml, /class="[^"]*pair-source-segment[^"]*"[^>]*id="intro"/);
    assert.doesNotMatch(codeHtml, /<li class="pair-unit"[^>]*\sid="intro"/);
    assert.match(codeHtml, /href="\/code_math\/assets\/css\/site\.css\?v=[^"]+"/);
    assert.match(
      codeHtml,
      /<script type="module" src="\/code_math\/assets\/js\/article\.js\?v=[^"]+"><\/script>/,
    );
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
    assert.match(codeHtml, /data-tag-name="\.\.\."/);
    assert.equal([...codeHtml.matchAll(/class="article-tag-legend-item"/g)].length, 6);
    assert.match(codeHtml, /data-tag-name="prefix-sum"[\s\S]*?<span class="article-tag-value">1<\/span>/);
    assert.match(codeHtml, /data-tag-name="\.\.\."[\s\S]*?<span class="article-tag-value"><\/span>/);
    assert.doesNotMatch(codeHtml, /class="article-ratio-chart article-ratio-chart--split"/);
    assert.doesNotMatch(codeHtml, /Archive Mix/);
    assert.match(codeHtml, /class="article-source-panel editorial-panel"/);
    assert.match(codeHtml, /data-note-stack/);
    assert.match(codeHtml, /data-focus-layer/);
    assert.match(codeHtml, /data-focus-card/);
    assert.doesNotMatch(codeHtml, /data-focus-shell/);
    assert.match(codeHtml, /class="[^"]*pair-unit[^"]*"/);
    assert.match(codeHtml, /class="[^"]*pair-source-segment[^"]*"[^>]*data-pair-index="1"/);
    assert.doesNotMatch(codeHtml, /data-lock-target=/);
    assert.match(codeHtml, /class="[^"]*pair-note-segment[^"]*"[^>]*data-note-panel/);
    assert.match(codeHtml, /data-pair-index="1"/);
    assert.match(codeHtml, /<code class="language-python"><span class="token token--keyword">def<\/span>/);
    assert.match(codeHtml, /<ul>/);
    assert.match(codeHtml, /<code>prefix\[right \+ 1\] - prefix\[left\]<\/code>/);
    assert.match(codeHtml, /<pre class="code-block code-block--python"><code class="language-python">/);

    assert.match(mathHtml, /gradient penalty term/);
    assert.match(mathHtml, /katex/);
    assert.match(mathHtml, /href="\/code_math\/assets\/css\/site\.css\?v=[^"]+"/);
    assert.match(mathHtml, /href="\/code_math\/assets\/vendor\/katex\/katex\.min\.css"/);
    assert.match(mathHtml, /class="[^"]*pair-source-segment--math[^"]*"/);
    assert.match(mathHtml, /class="article-chart-stack"/);
    assert.match(mathHtml, /class="article-tag-chart article-tag-chart--pie"/);
    assert.doesNotMatch(mathHtml, /class="article-ratio-chart article-ratio-chart--split"/);

    assert.match(emptyHtml, /token token--builtin">print/);
    assert.doesNotMatch(emptyHtml, /data-note-panel/);
    assert.doesNotMatch(emptyHtml, /data-note-stack/);
    assert.doesNotMatch(emptyHtml, /data-focus-layer/);
    assert.doesNotMatch(emptyHtml, /data-lock-target="1" id="only"/);
    assert.doesNotMatch(emptyHtml, /data-pair-index="1"/);
    assert.match(emptyHtml, /class="pair-source-marker pair-source-marker--silent"/);
    assert.match(nestedHtml, /Nested Project Note/);
    assert.match(nestedHtml, /href="\/code_math\/type\/code\/"/);
    assert.match(sparseHtml, /sparsegpt核心代码解析/);
    assert.match(sparseHtml, /href="\/code_math\/type\/code\/"/);
    assert.match(sparseHtml, /<span style="text-decoration: underline wavy;">sample的数据<\/span>/);
    assert.doesNotMatch(sparseHtml, /&lt;span style=/);
    assert.match(sparseHtml, /class="katex-display"/);
    assert.match(sparseHtml, /class="commentary-math-block"/);
    assert.doesNotMatch(sparseHtml, /class="katex-mathml"/);
    assert.doesNotMatch(sparseHtml, /eqn-num/);
    assert.doesNotMatch(sparseHtml, /<p>\\begin\{align\}/);
    assert.doesNotMatch(sparseHtml, /<p>:::pair<\/p>/);

    assert.match(typeHtml, /Prefix Sum Walkthrough/);
    assert.match(typeHtml, /href="\/code_math\/articles\/code\/project-a\/nested-note\/"/);
    assert.match(typeHtml, /href="\/code_math\/articles\/sparsegpt\/sparsegpt\.py\/"/);
    assert.match(tagHtml, /Regret Bound Walkthrough/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
