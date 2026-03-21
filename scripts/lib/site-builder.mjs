import { cp, readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import MarkdownIt from "markdown-it";
import markdownItKatex from "markdown-it-katex";
import katex from "katex";

import { parseArticleFile } from "./article-parser.mjs";
import { renderHomePage } from "../../templates/home-page.mjs";
import { renderArticlePage } from "../../templates/article-page.mjs";
import { renderListingPage } from "../../templates/listing-page.mjs";

const markdown = MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
}).use(markdownItKatex);

const SITE_TITLE = "code_math";
const TYPE_LABELS = {
  code: "代码批注",
  math: "数学证明",
};

export async function buildSite(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const articlesDir = options.articlesDir ?? path.join(rootDir, "articles");
  const outDir = options.outDir ?? path.join(rootDir, "dist");
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const assetsDir = options.assetsDir ?? path.join(packageRoot, "assets");
  const basePath = normalizeBasePath(options.basePath ?? process.env.SITE_BASE_PATH ?? "");

  const sourceFiles = await readMarkdownFiles(articlesDir);
  const articles = [];
  const slugs = new Set();

  for (const filePath of sourceFiles) {
    const rawSource = await readFile(filePath, "utf8");
    const parsed = parseArticleFile(filePath, rawSource);
    const pairBlueprints = extractPairBlueprints(rawSource);

    if (pairBlueprints.length !== parsed.pairs.length) {
      throw new Error(`${filePath}: parser output does not match pair block count`);
    }

    const article = normalizeArticle({
      basePath,
      filePath,
      meta: parsed.meta,
      pairs: parsed.pairs.map((pair, index) => ({
        ...pair,
        language: pairBlueprints[index].language,
        rightHtml: renderMarkdown(pair.right),
        leftHtml: renderLeftSource(pair.left, pairBlueprints[index].language),
      })),
    });

    if (slugs.has(article.slug)) {
      throw new Error(`${filePath}: duplicate slug "${article.slug}"`);
    }

    slugs.add(article.slug);

    const pairIds = new Set();
    for (const pair of article.pairs) {
      if (!pair.id) {
        continue;
      }

      if (pairIds.has(pair.id)) {
        throw new Error(`${filePath}: duplicate pair id "${pair.id}"`);
      }

      pairIds.add(pair.id);
    }

    articles.push(article);
  }

  const listings = collectListings(articles);
  const siteStats = collectSiteStats(listings);

  await rm(outDir, { recursive: true, force: true });
  await emitAssetFiles(assetsDir, outDir);

  await writeOutput(
    path.join(outDir, "index.html"),
    renderHomePage({
      siteTitle: SITE_TITLE,
      basePath,
      intro:
        "A lightweight reading site for paired code annotations and math proof notes.",
      guides: [
        { label: TYPE_LABELS.code, href: withBasePath(basePath, "/type/code/"), kind: "code" },
        { label: TYPE_LABELS.math, href: withBasePath(basePath, "/type/math/"), kind: "math" },
      ],
      latest: listings.latest,
    }),
  );

  for (const article of articles) {
    await writeOutput(
      path.join(outDir, "articles", encodeURIComponent(article.slug), "index.html"),
      renderArticlePage({
        siteTitle: SITE_TITLE,
        basePath,
        article,
        siteStats,
      }),
    );
  }

  for (const type of Object.keys(listings.byType)) {
    const articlesForType = listings.byType[type];
    if (articlesForType.length === 0) {
      continue;
    }

    await writeOutput(
      path.join(outDir, "type", encodeURIComponent(type), "index.html"),
      renderListingPage({
        siteTitle: SITE_TITLE,
        basePath,
        title: TYPE_LABELS[type] ?? type,
        intro: `All ${TYPE_LABELS[type] ?? type} articles.`,
        backHref: withBasePath(basePath, "/"),
        articles: articlesForType,
      }),
    );
  }

  for (const [tag, tagArticles] of Object.entries(listings.byTag)) {
    await writeOutput(
      path.join(outDir, "tag", encodeURIComponent(tag), "index.html"),
      renderListingPage({
        siteTitle: SITE_TITLE,
        basePath,
        title: `Tag: ${tag}`,
        intro: `Articles tagged with ${tag}.`,
        backHref: withBasePath(basePath, "/"),
        articles: tagArticles,
      }),
    );
  }

  return {
    articles,
    listings,
    siteStats,
    outDir,
  };
}

function collectSiteStats(listings) {
  const articleTypeCounts = {
    code: listings.byType.code.length,
    math: listings.byType.math.length,
  };

  return {
    articleTypeCounts,
    totalArticles: articleTypeCounts.code + articleTypeCounts.math,
  };
}

export function collectListings(articles) {
  const latest = [...articles].sort(compareArticlesByDateDesc);
  const byType = {
    code: latest.filter((article) => article.type === "code"),
    math: latest.filter((article) => article.type === "math"),
  };
  const byTag = {};

  for (const article of latest) {
    for (const tag of article.tags) {
      if (!byTag[tag]) {
        byTag[tag] = [];
      }

      byTag[tag].push(article);
    }
  }

  return {
    latest,
    byType,
    byTag,
  };
}

async function readMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readMarkdownFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  files.sort();
  return files;
}

function normalizeArticle({ basePath, filePath, meta, pairs }) {
  const tags = normalizeTags(meta.tags);
  const slug = String(meta.slug);

  return {
    filePath,
    ...meta,
    slug,
    tags,
    href: withBasePath(basePath, `/articles/${encodeURIComponent(slug)}/`),
    typeHref: withBasePath(basePath, `/type/${encodeURIComponent(meta.type)}/`),
    tagHrefs: tags.map((tag) => ({
      label: tag,
      href: withBasePath(basePath, `/tag/${encodeURIComponent(tag)}/`),
    })),
    pairs,
  };
}

function normalizeTags(tags) {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags.map(String);
  }

  return [String(tags)];
}

function compareArticlesByDateDesc(left, right) {
  return String(right.date).localeCompare(String(left.date));
}

function renderMarkdown(source) {
  return markdown.render(source ?? "");
}

function renderLeftSource(left, language) {
  if (left.kind === "code") {
    return `<pre><code class="language-${escapeHtml(language || "text")}">${escapeHtml(
      left.content ?? "",
    )}</code></pre>`;
  }

  return katex.renderToString(left.content ?? "", {
    displayMode: true,
    throwOnError: false,
  });
}

function extractPairBlueprints(rawSource) {
  const content = stripFrontMatter(rawSource);
  const lines = content.split(/\r?\n/);
  const blueprints = [];

  let index = 0;
  while (index < lines.length) {
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    if (!lines[index].trim().startsWith(":::pair")) {
      index += 1;
      continue;
    }

    const pairStart = index + 1;
    const closingIndex = findPairClosingIndex(lines, pairStart);
    const pairLines = lines.slice(pairStart, closingIndex >= 0 ? closingIndex : lines.length);
    blueprints.push(parsePairBlueprint(pairLines));
    index = closingIndex >= 0 ? closingIndex + 1 : lines.length;
  }

  return blueprints;
}

function stripFrontMatter(rawSource) {
  const lines = rawSource.split(/\r?\n/);

  if (lines[0]?.trim() !== "---") {
    return rawSource;
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return lines.slice(index + 1).join("\n");
    }
  }

  return rawSource;
}

function parsePairBlueprint(lines) {
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }

  const opener = lines[index]?.trim() ?? "";

  if (opener.startsWith("```")) {
    const language = opener.slice(3).trim() || "text";
    return {
      language,
    };
  }

  if (opener === "$$" || /^(\$\$.*\$\$)$/.test(opener)) {
    return {
      language: "math",
    };
  }

  return {
    language: "text",
  };
}

function findPairClosingIndex(lines, startIndex) {
  let inFencedCodeBlock = false;
  let inDisplayMathBlock = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (inFencedCodeBlock) {
      if (trimmed === "```") {
        inFencedCodeBlock = false;
      }
      continue;
    }

    if (inDisplayMathBlock) {
      if (trimmed === "$$") {
        inDisplayMathBlock = false;
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      inFencedCodeBlock = true;
      continue;
    }

    if (trimmed === "$$") {
      inDisplayMathBlock = true;
      continue;
    }

    if (trimmed === ":::") {
      return index;
    }
  }

  return -1;
}

async function writeOutput(filePath, html) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, html, "utf8");
}

async function emitAssetFiles(assetsDir, outDir) {
  const assetFiles = [
    ["css", "site.css"],
    ["js", "article.js"],
  ];

  for (const [kind, fileName] of assetFiles) {
    const sourcePath = path.join(assetsDir, kind, fileName);
    const targetPath = path.join(outDir, "assets", kind, fileName);
    const source = await readFile(sourcePath, "utf8");
      await writeOutput(targetPath, source);
  }

  const katexDistDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "node_modules",
    "katex",
    "dist",
  );
  const katexCssSource = path.join(katexDistDir, "katex.min.css");
  const katexCssTarget = path.join(outDir, "assets", "vendor", "katex", "katex.min.css");
  const katexFontsSource = path.join(katexDistDir, "fonts");
  const katexFontsTarget = path.join(outDir, "assets", "vendor", "katex", "fonts");

  await writeOutput(katexCssTarget, await readFile(katexCssSource, "utf8"));
  await cp(katexFontsSource, katexFontsTarget, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "";
  }

  const trimmed = String(basePath).trim().replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function withBasePath(basePath, pathname) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${basePath}${normalizedPath}` || "/";
}
