import test from "node:test";
import assert from "node:assert/strict";

import { parseArticleFile } from "../scripts/lib/article-parser.mjs";

test("parses required front matter and code pair content", () => {
  const source = `---
title: Prefix Sum Walkthrough
slug: prefix-sum-note
date: 2026-03-20
type: code
tags:
  - algorithm
summary: Explain prefix sums.
---

:::pair id=intro
\`\`\`python
def solve(nums):
    prefix = [0]
\`\`\`

The sentinel zero keeps interval sums uniform.
:::
`;

  const article = parseArticleFile("articles/prefix-sum-note.md", source);

  assert.equal(article.meta.title, "Prefix Sum Walkthrough");
  assert.equal(article.meta.slug, "prefix-sum-note");
  assert.equal(article.meta.type, "code");
  assert.equal(article.pairs.length, 1);
  assert.equal(article.pairs[0].id, "intro");
  assert.equal(article.pairs[0].left.kind, "code");
  assert.match(article.pairs[0].left.content, /def solve/);
  assert.match(article.pairs[0].right, /sentinel zero/);
});

test("parses display-math left blocks for math articles", () => {
  const source = `---
title: Regret Bound
slug: regret-bound-note
date: 2026-03-20
type: math
---

:::pair id=bound
$$
\\mathbb{E}[R_T] \\le \\sum_{t=1}^{T} \\frac{1}{\\eta_t}
$$

This isolates the inverse learning-rate term.
:::
`;

  const article = parseArticleFile("articles/regret-bound-note.md", source);

  assert.equal(article.meta.type, "math");
  assert.equal(article.pairs[0].left.kind, "math");
  assert.match(article.pairs[0].left.content, /\\mathbb{E}\[R_T\]/);
  assert.match(article.pairs[0].right, /inverse learning-rate/);
});

test("parses single-line display-math left blocks", () => {
  const source = `---
title: Compact Math
slug: compact-math
date: 2026-03-20
type: math
---

:::pair id=compact
$$ a^2 + b^2 = c^2 $$

This is the compact form.
:::
`;

  const article = parseArticleFile("articles/compact-math.md", source);

  assert.equal(article.pairs.length, 1);
  assert.equal(article.pairs[0].left.kind, "math");
  assert.equal(article.pairs[0].left.content, "a^2 + b^2 = c^2");
  assert.match(article.pairs[0].right, /compact form/);
});

test("rejects unsupported article types", () => {
  const source = `---
title: Bad Type
slug: bad-type
date: 2026-03-20
type: note
---

:::pair
\`\`\`txt
bad
\`\`\`

bad
:::
`;

  assert.throws(
    () => parseArticleFile("articles/bad-type.md", source),
    /unsupported type/i,
  );
});

test("rejects malformed pair blocks without a left source block", () => {
  const source = `---
title: Broken
slug: broken
date: 2026-03-20
type: code
---

:::pair
This starts with annotation text, not a supported left source block.
:::
`;

  assert.throws(
    () => parseArticleFile("articles/broken.md", source),
    /left-side source block/i,
  );
});

test("rejects articles with no pair blocks", () => {
  const source = `---
title: No Pairs
slug: no-pairs
date: 2026-03-20
type: code
---
`;

  assert.throws(
    () => parseArticleFile("articles/no-pairs.md", source),
    /one or more pair blocks/i,
  );
});

test("rejects missing required front matter fields", () => {
  const source = `---
slug: missing-title
date: 2026-03-20
type: code
---

:::pair
\`\`\`txt
ok
\`\`\`

ok
:::
`;

  assert.throws(
    () => parseArticleFile("articles/missing-title.md", source),
    /missing required front matter field "title"/i,
  );
});

test("rejects invalid pair headers", () => {
  const source = `---
title: Bad Header
slug: bad-header
date: 2026-03-20
type: code
---

:::pair foo=bar
\`\`\`txt
ok
\`\`\`

ok
:::
`;

  assert.throws(
    () => parseArticleFile("articles/bad-header.md", source),
    /bad-header.*unsupported pair header/i,
  );
});

test("rejects missing closing pair terminators", () => {
  const source = `---
title: Missing Close
slug: missing-close
date: 2026-03-20
type: code
---

:::pair
\`\`\`txt
ok
\`\`\`

ok
`;

  assert.throws(
    () => parseArticleFile("articles/missing-close.md", source),
    /missing closing :::/i,
  );
});

test("rejects unclosed code and math source blocks", () => {
  const codeSource = `---
title: Unclosed Code
slug: unclosed-code
date: 2026-03-20
type: code
---

:::pair
\`\`\`txt
ok

text
:::
`;

  const mathSource = `---
title: Unclosed Math
slug: unclosed-math
date: 2026-03-20
type: math
---

:::pair
\$\$
ok

text
:::
`;

  assert.throws(
    () => parseArticleFile("articles/unclosed-code.md", codeSource),
    /unclosed fenced code block/i,
  );
  assert.throws(
    () => parseArticleFile("articles/unclosed-math.md", mathSource),
    /unclosed display math block/i,
  );
});

test("ignores pair terminators inside fenced code blocks", () => {
  const source = `---
title: Literal Terminator
slug: literal-terminator
date: 2026-03-20
type: code
---

:::pair id=literal
\`\`\`python
def show_marker():
    pass
:::
\`\`\`

The literal terminator belongs to the code sample.
:::
`;

  const article = parseArticleFile("articles/literal-terminator.md", source);

  assert.equal(article.pairs.length, 1);
  assert.match(article.pairs[0].left.content, /pass/);
  assert.match(article.pairs[0].right, /literal terminator belongs/);
});
