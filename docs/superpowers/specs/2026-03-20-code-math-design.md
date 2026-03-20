# code_math Design Spec

**Date:** 2026-03-20
**Location:** `blog/code_math`
**Status:** Approved in conversation, written for implementation planning

## Goal

Build an independent static website in `blog/code_math` for two kinds of annotated reading:

1. Code annotation and source walkthroughs, with source blocks on the left and commentary on the right.
2. Math proof walkthroughs, with formula/proof blocks on the left and commentary on the right.

The site must support a lightweight local authoring workflow similar to blog publishing: create one Markdown file per article, run a build command, then deploy the generated static files to GitHub Pages or another static host.

The site must also support multiple articles in one website, with a guide-style homepage that can route users into specific articles, themes, and content types.

## Product Decisions Already Confirmed

- The site is a standalone project under `blog/code_math`, not part of the existing `blog/Ken` site.
- Each article is authored as one self-contained Markdown file.
- The authoring protocol is hybrid:
  - default mapping is sequential "left block + right annotation"
  - explicit block ids are allowed when precise references are needed
- The build system is a lightweight custom static generator, not Hexo.
- The homepage is a hybrid guide page:
  - top-level entry points for content types and themes
  - latest article list below
- Visual direction is "Editorial / 学术刊物感":
  - warm light background
  - paper-like reading tone
  - restrained code styling
  - annotations that feel like margin notes rather than chat bubbles

## Non-Goals

- No CMS, database, or server-side rendering.
- No live in-browser editing.
- No external runtime dependency for loading article content.
- No first-version support for one left block mapping to many independent annotation blocks.
- No first-version full-text search unless it falls out cheaply from generated metadata.

## Users and Use Cases

### Primary user

The site author writes technical notes locally, commits them to Git, builds a static site, and deploys it.

### Primary readers

Readers browse annotated code explanations and proof walkthroughs on desktop and mobile.

### Core use cases

- Author writes one Markdown file to publish one code walkthrough.
- Author writes one Markdown file to publish one proof walkthrough.
- Reader lands on homepage, chooses between code-oriented and math-oriented content.
- Reader opens an article and reads paired left/right blocks with aligned commentary.
- Reader shares or jumps to a specific annotated block using an anchor.

## Information Architecture

## 1. Homepage

The homepage combines a guide layer and a latest-content layer.

### Homepage sections

- Hero / site intro
  - short explanation of what the site is
  - clear entry points into the two content modes
- Topic guide
  - entry cards such as `代码批注`, `数学证明`, and selected tags/series
- Latest articles
  - ordered by date descending
  - each item shows title, summary, type, tags, and date

### Homepage navigation behavior

- Clicking a content-type entry filters to the relevant article listing page or section.
- Clicking a tag/series entry routes to a filtered listing.
- Clicking a latest article opens its dedicated article page.

## 2. Article Page

Each article page is a structured reading surface for paired content.

### Desktop layout

- Left column: source material
  - code blocks for code articles
  - proof/formula blocks for math articles
- Right column: commentary
  - prose explanations
  - inline and display math supported
- Blocks are aligned by pair.
- Hovering or focusing one side highlights the matching block on the other side.

### Mobile layout

- The page collapses into a stacked layout.
- Each pair becomes one vertical unit:
  - source block first
  - commentary below
- Highlight/link behavior remains available by tap.

### Deep links

- Any pair with an explicit id becomes addressable by anchor.
- Anchor navigation highlights the targeted pair on load.

## Content Model

Each article is converted into one structured document with:

- metadata
- ordered list of pairs
- optional ids for direct references

### Metadata fields

Required:

- `title`
- `slug`
- `date`
- `type` with allowed values `code` or `math`

Recommended:

- `tags`
- `summary`

Optional:

- `series`
- `cover`
- `draft`

### Pair structure

Each pair contains:

- optional `id`
- `left`
  - source type and raw content
- `right`
  - annotation content as Markdown with math support

### Left-side source types in v1

- fenced code blocks
- display math blocks

To keep parsing deterministic in v1, the left side must begin with one of those two structural forms.
Free-form theorem text, proof intuition, and transitional prose should stay on the right-side annotation panel.
If support for richer left-side mixed Markdown is needed later, it should be added as an explicit protocol extension rather than inferred heuristically.

## Authoring Protocol

Each article is authored as one self-contained Markdown file with front matter and one or more `:::pair` blocks.

### Example shape

```md
---
title: Prefix Sum Walkthrough
slug: prefix-sum-note
date: 2026-03-20
type: code
tags: [algorithm, prefix-sum]
summary: Explain why prefix sums are initialized with a sentinel zero.
---

:::pair id=intro
```python
def solve(nums):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
```

The sentinel `0` makes later interval sums uniform.
:::

:::pair
```python
def range_sum(l, r):
    return prefix[r] - prefix[l]
```

This depends on the indexing convention established above.
:::
```

### Protocol rules

- One `:::pair` block defines one rendered pair.
- The block contains:
  - first one left-side source block
  - then the right-side annotation
- In v1, the left-side source block must be either:
  - one fenced code block
  - one display math block
- Everything after that first source block is parsed as the right-side annotation.
- If the pair needs stable deep links or explicit references, add `id=...`.
- If no id is provided, rendering still works but no stable anchor is generated.
- The first version assumes one annotation body per pair.

### Parsing expectation

The parser must split the contents of `:::pair` into:

- the first supported source block as the left-side source
- the remaining Markdown content as the right-side annotation

If a pair block is malformed, the build must fail with a specific file-and-block error message.

## Rendering Requirements

## 1. Markdown and Math

- Standard Markdown is supported in commentary.
- Inline and display math must render correctly in commentary.
- Display math on the left side must render correctly for proof articles.

## 2. Code Rendering

- Code blocks must preserve whitespace and language class.
- Line numbers are optional in v1, but the layout must leave room for adding them later.
- Horizontal overflow must be handled without breaking the paired layout.

## 3. Pair Interaction

- Hovering a pair on desktop highlights both left and right blocks.
- Clicking or tapping a pair updates the URL hash when the pair has an id.
- Loading a page with a known hash highlights and scrolls to the matched pair.

## 4. Listing Pages

At minimum, generated listings must support:

- homepage latest list
- filtering by article type
- filtering by tag

Series pages are optional in v1 if the data model supports them cleanly.

## Frontend Design Direction

The interface should follow the confirmed editorial direction rather than a generic blog template.

### Visual characteristics

- warm off-white page background
- dark ink-like text
- serif-forward headings and body typography
- restrained accent color used for annotations and navigation
- generous whitespace
- subtle paper/journal feeling

### Article page tone

- source blocks should feel embedded into a scholarly page
- annotation panels should read like margin commentary
- mathematical content should have more breathing room than standard blog content

### Homepage tone

- should feel like a table of contents or journal issue front page
- should not look like a generic card-grid SaaS landing page

## Technical Architecture

The project should be a minimal static generator with a thin front-end layer.

## Directory plan

```text
blog/code_math/
  articles/
  assets/
    css/
    js/
    fonts/
  templates/
  scripts/
  dist/
  content-examples/
  docs/superpowers/specs/
```

## Build pipeline

1. Read all article Markdown files from `articles/`.
2. Parse front matter.
3. Parse custom `:::pair` blocks into structured data.
4. Convert article bodies into normalized JSON-like records in memory.
5. Render:
   - homepage
   - article detail pages
   - basic filtered listing pages
6. Write the final static site into `dist/`.

## Template responsibilities

- Article template:
  - render metadata
  - render ordered pairs
  - emit anchor ids
- Homepage template:
  - render intro
  - render guide entries
  - render latest list
- Listing template:
  - render filtered article collections

## Front-end JavaScript responsibilities

JavaScript must remain thin and non-essential for content loading.

Allowed responsibilities:

- pair highlight syncing
- hash-based focus
- small mobile interactions

Disallowed responsibilities:

- runtime parsing of source Markdown
- runtime fetching of article content as the primary render path

## Error Handling

The build should fail loudly and specifically for invalid author input.

### Build-time errors that must be explicit

- missing required front matter fields
- duplicate `slug`
- duplicate pair `id` within one article
- malformed `:::pair` blocks
- pair block without a detectable left-side structural block
- unsupported `type` value

### Error output quality

Errors should include:

- file path
- article slug if available
- pair id if available
- short explanation of the problem

## Testing Strategy

The first implementation should include focused automated tests for the core protocol and generator behavior.

### Parser tests

- parses front matter correctly
- parses sequential pairs correctly
- preserves explicit pair ids
- accepts code-left + markdown-right pairs
- accepts math-left + markdown-right pairs
- rejects malformed pair syntax

### Build tests

- generates one valid article page from a code example
- generates one valid article page from a math example
- generates homepage with latest article entries
- generates type/tag listing pages

### UI verification

Manual verification is required for:

- desktop two-column layout
- mobile stacked layout
- math rendering
- hash navigation
- highlight syncing between left and right blocks

## Deployment Model

The output is a plain static site from `dist/`.

### Publish workflow

1. Create or edit a Markdown file in `articles/`.
2. Run the build command.
3. Deploy `dist/` to GitHub Pages or another static host.

### GitHub Pages expectation

The generated site must not require a server, database, or framework runtime.

## Open Decisions Deferred On Purpose

These are intentionally deferred from v1 unless implementation stays simple:

- site search
- prev/next article navigation
- series landing pages beyond basic data support
- syntax-highlight theme customization beyond the base editorial theme

## Implementation Readiness

This spec is intentionally scoped to one coherent project:

- one custom generator
- one authoring protocol
- one homepage model
- one article reading surface

It is ready to be converted into a detailed implementation plan.

## Environment Note

This workspace is not currently inside a Git repository, so the normal "write spec and commit it" step from the brainstorming workflow cannot be completed here unless the project is later initialized or moved into a Git repo.
