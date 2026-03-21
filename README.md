# code_math

`code_math` is a static site for annotated code walkthroughs and math proof notes.

## Article Protocol

Write each article as a Markdown file in `articles/` with front matter plus one or more
`:::pair` blocks.

You can also organize files in nested folders such as `articles/code/project-a/foo.md`
or `articles/math/project-b/bar.md`. Folder structure is preserved in article URLs, so
`articles/code/project-a/foo.md` becomes `/articles/code/project-a/<slug>/`.

The folder name does not replace front matter. Each file still needs its own:

```yaml
title:
slug:
date:
type: code | math
```

Recommended usage:

- Put articles from the same project together under one folder.
- Keep using `type: code` or `type: math` to control which top-level listing page they
  appear in.
- Use deeper subfolders when a project has multiple subtopics.

Examples:

```text
articles/code/sparsegpt/overview.md
articles/code/sparsegpt/analysis/pruning-step.md
articles/math/bandit/regret/basic-bound.md
```

With:

```yaml
slug: pruning-step
type: code
```

the second file above will be published at:

```text
/articles/code/sparsegpt/analysis/pruning-step/
```

~~~md
---
title: Prefix Sum Walkthrough
slug: prefix-sum-note
date: 2026-03-20
type: code
links:
  - "[Prefix sum overview](https://en.wikipedia.org/wiki/Prefix_sum)"
---

:::pair id=intro
```python
def solve(nums):
    prefix = [0]
```

The annotation explains the source block.
:::
~~~

Use `id=...` when you want a stable anchor for a pair. Omit it when you do not need a
hash target.

`links` is optional. Write it as a list of Markdown links in front matter when you want
the masthead to show related resources.

## Local Commands

```bash
npm install
npm test
npm run build
```

## Deployment

The build writes the site to `dist/`.

### GitHub Pages

This repository includes [deploy-pages.yml](/home/ken/Project/blog/code_math/.github/workflows/deploy-pages.yml),
which builds and publishes the site with GitHub Actions.

1. Push this project to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, choose `GitHub Actions`.
4. Push to `main` or `master`.
5. GitHub Actions will run `npm ci` and `npm run build`, then publish `dist/`.

The workflow automatically computes `SITE_BASE_PATH`:

- If the repository is named `<user>.github.io`, the site is built for `/`.
- Otherwise it is built for `/<repo-name>`, which is the normal GitHub Pages project-site path.

### After Updating Markdown

When you add or edit files in `articles/`:

```bash
npm test
npm run build
git add .
git commit -m "Update article content"
git push
```

After the push, GitHub Actions will rebuild and redeploy the website automatically.

### Manual Check Before Push

If you want to preview locally before publishing:

```bash
npm run build
python3 -m http.server 4173 -d dist
```

Then open `http://127.0.0.1:4173/`.
