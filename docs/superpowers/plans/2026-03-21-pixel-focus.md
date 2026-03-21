# Pixel Focus Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize article auto-focus for dense adjacent blocks and redesign the site into a warm pixel-terminal style without changing interaction behavior.

**Architecture:** Keep the current article/page structure and JS entrypoints, but replace the auto-focus selection with a hysteresis-based state machine. Re-skin the shared CSS and homepage/listing/article templates so the entire site uses one consistent pixel-panel visual system.

**Tech Stack:** Static HTML templates, vanilla JS, shared CSS, Node test runner.

---

## Chunk 1: Stable Auto-Focus

### Task 1: Reproduce the oscillation in a unit test

**Files:**
- Modify: `tests/article-focus.test.mjs`
- Modify: `assets/js/article-focus-logic.js`

- [ ] **Step 1: Write the failing test**

Add a test where two short adjacent blocks compete near the viewport center while the first block is still inside a retention zone.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/article-focus.test.mjs`
Expected: FAIL because the current selector switches too early.

- [ ] **Step 3: Write minimal implementation**

Extend the focus selector so it accepts the current active index and applies a retention band before switching.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/article-focus.test.mjs`
Expected: PASS.

### Task 2: Wire the stable selector into the article runtime

**Files:**
- Modify: `assets/js/article.js`

- [ ] **Step 1: Update the runtime selection flow**

Use the active pair index when computing the next focus target and remove brittle switching behavior for closely spaced blocks.

- [ ] **Step 2: Verify the monotonic-queue article path**

Run: `SITE_BASE_PATH=/code_math npm run build`
Expected: Build succeeds and the generated article still includes the focus layer.

### Task 3: Verify regression coverage

**Files:**
- Modify: `tests/build.test.mjs` if needed

- [ ] **Step 1: Run the focused tests**

Run: `node --test tests/article-focus.test.mjs tests/build.test.mjs`
Expected: PASS.

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS.

## Chunk 2: Warm Pixel Terminal Redesign

### Task 4: Replace the global visual tokens

**Files:**
- Modify: `assets/css/site.css`

- [ ] **Step 1: Introduce pixel-style tokens**

Replace the current soft-card variables with harder panel edges, stepped shadows, pixel grid backgrounds, and a tighter warm palette.

- [ ] **Step 2: Keep content readability intact**

Preserve article text contrast, code readability, and math rendering legibility.

### Task 5: Redesign homepage and listings without changing routing

**Files:**
- Modify: `templates/home-page.mjs`
- Modify: `templates/listing-page.mjs`

- [ ] **Step 1: Rebuild homepage hierarchy**

Make the homepage a pixel-terminal cover with a strong mark, two route entries, and a cleaner archive layout.

- [ ] **Step 2: Rebuild listing pages**

Apply the same pixel-panel system to listing pages so the style is consistent site-wide.

### Task 6: Re-skin article chrome without changing interaction behavior

**Files:**
- Modify: `templates/article-page.mjs`
- Modify: `assets/css/site.css`

- [ ] **Step 1: Re-skin masthead and reading panes**

Keep the same DOM structure and JS hooks, but change presentation to pixel panels, hard borders, and stepped accents.

- [ ] **Step 2: Re-skin focus card and source markers**

Retain the same auto-focus interaction while making the active state feel consistent with the pixel system.

### Task 7: Final verification

**Files:**
- Verify generated `dist/`

- [ ] **Step 1: Rebuild**

Run: `SITE_BASE_PATH=/code_math npm run build`
Expected: PASS.

- [ ] **Step 2: Re-run all tests**

Run: `npm test`
Expected: PASS.
