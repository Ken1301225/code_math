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
  highlight(source, language) {
    return renderHighlightedCodeBlock(source, language);
  },
}).use(markdownItKatex);

const SITE_TITLE = "code_math";
const TYPE_LABELS = {
  code: "代码批注",
  math: "数学证明",
};
const TAG_COLORS = ["#6e4a33", "#a96f43", "#cf9556", "#e0b770", "#b1644c", "#8f7f5d"];

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
  const tagCounts = Object.entries(listings.byTag)
    .map(([tag, taggedArticles], index) => ({
      tag,
      count: taggedArticles.length,
      color: TAG_COLORS[index % TAG_COLORS.length],
    }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
  const totalTagAssignments = tagCounts.reduce((sum, item) => sum + item.count, 0);

  return {
    articleTypeCounts,
    totalArticles: articleTypeCounts.code + articleTypeCounts.math,
    totalTagAssignments,
    tagCounts: tagCounts.map((item) => ({
      ...item,
      percent: totalTagAssignments ? Math.round((item.count / totalTagAssignments) * 100) : 0,
    })),
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
  const links = normalizeLinks(meta.links, filePath);

  return {
    filePath,
    ...meta,
    slug,
    tags,
    links,
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

function normalizeLinks(links, filePath) {
  if (!links) {
    return [];
  }

  const values = Array.isArray(links) ? links : [links];
  return values.map((value) => parseMarkdownLink(String(value), filePath));
}

function parseMarkdownLink(source, filePath) {
  const match = /^\[([^\]]+)\]\((.+)\)$/.exec(source.trim());

  if (!match) {
    throw new Error(
      `${filePath}: front matter links entries must use Markdown link syntax like [label](href)`,
    );
  }

  return {
    label: match[1].trim(),
    href: match[2].trim(),
  };
}

function compareArticlesByDateDesc(left, right) {
  return String(right.date).localeCompare(String(left.date));
}

function renderMarkdown(source) {
  return markdown.render(source ?? "");
}

function renderLeftSource(left, language) {
  if (left.kind === "code") {
    return renderHighlightedCodeBlock(left.content ?? "", language);
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

function renderHighlightedCodeBlock(source, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const highlighted = highlightCode(source ?? "", normalizedLanguage);

  return `<pre class="code-block code-block--${escapeHtml(
    normalizedLanguage,
  )}"><code class="language-${escapeHtml(normalizedLanguage)}">${highlighted}</code></pre>`;
}

function normalizeLanguage(language) {
  const value = String(language || "text").toLowerCase();
  const aliases = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    shell: "bash",
    sh: "bash",
  };

  return aliases[value] ?? value;
}

function highlightCode(source, language) {
  if (language === "python") {
    return applyHighlightRules(source, PYTHON_RULES);
  }

  if (language === "javascript" || language === "typescript") {
    return applyHighlightRules(source, JAVASCRIPT_RULES);
  }

  if (language === "bash") {
    return applyHighlightRules(source, SHELL_RULES);
  }

  return escapeHtml(source);
}

function applyHighlightRules(source, rules) {
  let index = 0;
  let html = "";

  while (index < source.length) {
    let matched = false;

    for (const rule of rules) {
      rule.regex.lastIndex = index;
      const match = rule.regex.exec(source);
      if (!match) {
        continue;
      }

      html += `<span class="token token--${rule.kind}">${escapeHtml(match[0])}</span>`;
      index = rule.regex.lastIndex;
      matched = true;
      break;
    }

    if (!matched) {
      html += escapeHtml(source[index]);
      index += 1;
    }
  }

  return html;
}

const PYTHON_RULES = [
  { kind: "comment", regex: /#[^\n]*/y },
  { kind: "string", regex: /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
  { kind: "decorator", regex: /@[A-Za-z_][\w.]*/y },
  { kind: "function", regex: /(?<=\b(?:def|class)\s)[A-Za-z_]\w*/y },
  {
    kind: "keyword",
    regex:
      /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/y,
  },
  {
    kind: "builtin",
    regex: /\b(?:abs|all|any|bool|dict|enumerate|float|int|len|list|max|min|print|range|set|str|sum|tuple)\b/y,
  },
  { kind: "number", regex: /\b\d+(?:\.\d+)?\b/y },
  { kind: "operator", regex: /[-+*/%=<>!]+/y },
  { kind: "punctuation", regex: /[()[\]{},.:]/y },
];

const JAVASCRIPT_RULES = [
  { kind: "comment", regex: /\/\/[^\n]*|\/\*[\s\S]*?\*\//y },
  { kind: "string", regex: /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
  { kind: "function", regex: /(?<=\b(?:function|class|const|let|var)\s)[A-Za-z_$][\w$]*/y },
  {
    kind: "keyword",
    regex:
      /\b(?:async|await|break|case|catch|class|const|continue|default|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|true|try|typeof|undefined|var|while|yield)\b/y,
  },
  { kind: "number", regex: /\b\d+(?:\.\d+)?\b/y },
  { kind: "operator", regex: /[-+*/%=<>!&|?:]+/y },
  { kind: "punctuation", regex: /[()[\]{},.;]/y },
];

const SHELL_RULES = [
  { kind: "comment", regex: /#[^\n]*/y },
  { kind: "string", regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
  {
    kind: "keyword",
    regex: /\b(?:if|then|else|elif|fi|for|do|done|case|esac|while|in|function)\b/y,
  },
  { kind: "builtin", regex: /\b(?:cd|echo|export|git|ls|node|npm|python3)\b/y },
  { kind: "number", regex: /\b\d+(?:\.\d+)?\b/y },
  { kind: "operator", regex: /[-+*/%=<>!|&]+/y },
  { kind: "punctuation", regex: /[()[\]{},.;]/y },
];

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
