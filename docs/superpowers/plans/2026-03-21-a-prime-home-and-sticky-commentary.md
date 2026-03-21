# A-Prime Home And Sticky Commentary Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild article commentary interaction around a sticky right-side pointer card and redesign the homepage into a richer warm pixel research workshop scene.

**Architecture:** The article page will stop repositioning commentary cards against source blocks and instead use a sticky commentary card with a fixed trigger line, switching content based on which annotated source block intersects that line while preserving stable document height. The homepage will keep current routing/content structure but replace the sparse terminal treatment with a more scene-based pixel composition using CSS art and additional decorative modules.

**Tech Stack:** Static HTML templates (`.mjs`), vanilla JS, CSS, Node test runner.

---

## Chunk 1: Sticky Commentary Interaction

### Task 1: Add failing tests for pointer-line driven article focus

**Files:**
- Modify: `blog/code_math/tests/article-focus.test.mjs`
- Test: `blog/code_math/tests/article-focus.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add tests that verify:
- a fixed trigger line selects the block containing that line
- the last annotated block can still be selected before page bottom because of extra scroll runway
- a tall current block does not get abandoned until the pointer line leaves its intended hold zone

- [ ] **Step 2: Run the targeted test file to verify failure**

Run: `cd /home/ken/Project/blog/code_math && node --test tests/article-focus.test.mjs`
Expected: FAIL in the newly added pointer-line tests.

- [ ] **Step 3: Implement minimal selection helpers**

Modify `blog/code_math/assets/js/article-focus-logic.js` to expose focused helpers for:
- pointer line based index selection
- extra runway / end-of-stream behavior
- preserving current block only when the pointer line has not crossed the intended release threshold

- [ ] **Step 4: Run the targeted test file to verify it passes**

Run: `cd /home/ken/Project/blog/code_math && node --test tests/article-focus.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/ken/Project/blog/code_math
git add tests/article-focus.test.mjs assets/js/article-focus-logic.js
git commit -m "Refine pointer-line article focus selection"
```

### Task 2: Rework article runtime to use a sticky commentary card with a top trigger pointer

**Files:**
- Modify: `blog/code_math/templates/article-page.mjs`
- Modify: `blog/code_math/assets/js/article.js`
- Modify: `blog/code_math/assets/css/site.css`
- Modify: `blog/code_math/tests/build.test.mjs`
- Test: `blog/code_math/tests/build.test.mjs`

- [ ] **Step 1: Write the failing build-level assertions**

Add assertions for:
- sticky commentary card structure (pointer/notch element and sticky shell)
- source column runway element or equivalent bottom spacing hook
- no legacy moving-card assumptions that depend on matching source block vertical offset exactly

- [ ] **Step 2: Run build test to verify failure**

Run: `cd /home/ken/Project/blog/code_math && node --test tests/build.test.mjs`
Expected: FAIL on new sticky commentary assertions.

- [ ] **Step 3: Implement minimal DOM/CSS/JS changes**

Implement:
- a sticky right commentary shell with a visible top-edge pointer
- a fixed trigger line derived from the sticky card top edge
- source-column end runway so the final block can cross the trigger line
- lighter transform-only transitions and reduced layout work during scroll

- [ ] **Step 4: Run build test to verify it passes**

Run: `cd /home/ken/Project/blog/code_math && node --test tests/build.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd /home/ken/Project/blog/code_math && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/ken/Project/blog/code_math
git add templates/article-page.mjs assets/js/article.js assets/css/site.css tests/build.test.mjs
git commit -m "Implement sticky pointer commentary interaction"
```

## Chunk 2: Pixel Research Workshop Homepage

### Task 3: Add homepage structure for pixel scene modules

**Files:**
- Modify: `blog/code_math/templates/home-page.mjs`
- Modify: `blog/code_math/tests/build.test.mjs`
- Test: `blog/code_math/tests/build.test.mjs`

- [ ] **Step 1: Write failing assertions for new homepage scene modules**

Add assertions for:
- a pixel workshop scene container
- at least one researcher/character module
- pixel prop modules (CRT/toolkit/books/robot or similar)
- archive grid still present and reachable

- [ ] **Step 2: Run build test to verify failure**

Run: `cd /home/ken/Project/blog/code_math && node --test tests/build.test.mjs`
Expected: FAIL on the new homepage structure assertions.

- [ ] **Step 3: Implement minimal homepage markup changes**

Keep current data flow but add:
- scene wrapper
- pixel character slot
- prop clusters
- richer status/guide/archive framing

- [ ] **Step 4: Run build test to verify it passes**

Run: `cd /home/ken/Project/blog/code_math && node --test tests/build.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/ken/Project/blog/code_math
git add templates/home-page.mjs tests/build.test.mjs
git commit -m "Add homepage pixel workshop structure"
```

### Task 4: Apply the warm pixel workshop visual system

**Files:**
- Modify: `blog/code_math/assets/css/site.css`
- Test: `blog/code_math/tests/build.test.mjs`

- [ ] **Step 1: Write a minimal assertion for homepage visual hooks if still missing**

Ensure build tests cover a small set of durable class names used by the pixel workshop scene.

- [ ] **Step 2: Run build test to verify red if new assertions were added**

Run: `cd /home/ken/Project/blog/code_math && node --test tests/build.test.mjs`
Expected: FAIL only if new assertions were added in Step 1.

- [ ] **Step 3: Implement the CSS art and scene styling**

Add:
- pixel researcher illustration
- CRT / books / chip / robot / paper props
- stepped borders and stronger 8-bit panel treatment
- subtle sprite-style motion only where it does not hurt performance

- [ ] **Step 4: Run full verification**

Run:
- `cd /home/ken/Project/blog/code_math && npm test`
- `cd /home/ken/Project/blog/code_math && SITE_BASE_PATH=/code_math npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/ken/Project/blog/code_math
git add assets/css/site.css tests/build.test.mjs
git commit -m "Style homepage as a pixel research workshop"
```

## Chunk 3: Final Verification

### Task 5: Manual polish and final verification

**Files:**
- Review only: `blog/code_math/templates/article-page.mjs`
- Review only: `blog/code_math/templates/home-page.mjs`
- Review only: `blog/code_math/assets/css/site.css`
- Review only: `blog/code_math/assets/js/article.js`
- Review only: `blog/code_math/assets/js/article-focus-logic.js`

- [ ] **Step 1: Run complete verification**

Run:
- `cd /home/ken/Project/blog/code_math && npm test`
- `cd /home/ken/Project/blog/code_math && SITE_BASE_PATH=/code_math npm run build`

Expected: PASS.

- [ ] **Step 2: Smoke-check generated homepage and article output**

Inspect:
- `dist/index.html`
- `dist/articles/sparsegpt/sparsegpt.py/index.html`
- `dist/articles/monotonic-queue-note/index.html`

Confirm:
- homepage scene modules exist
- sticky commentary shell exists
- source runway element exists or equivalent bottom spacing hook is present

- [ ] **Step 3: Commit final polish if needed**

```bash
cd /home/ken/Project/blog/code_math
git add .
git commit -m "Polish pixel home and sticky commentary experience"
```
