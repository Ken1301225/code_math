export function renderArticlePage({ siteTitle, basePath, article, siteStats }) {
  return pageShell({
    siteTitle,
    pageTitle: article.title,
    basePath,
    body: `
      <main class="page article-page article-page--${escapeHtml(article.type)}">
        <header class="article-masthead editorial-panel">
          <div class="article-masthead-topline">
            <p class="article-kicker"><a href="${escapeHtml(withBasePath(basePath, "/"))}">Home</a></p>
            <p class="article-type-pill"><a href="${escapeHtml(article.typeHref)}">${escapeHtml(article.type)}</a></p>
          </div>
          <div class="article-masthead-body">
            <div class="article-masthead-main">
              <div class="article-heading">
                <h1>${escapeHtml(article.title)}</h1>
                <p class="article-summary">${escapeHtml(article.summary ?? "")}</p>
              </div>
              <dl class="article-meta article-meta--hero">
                <div><dt>Date</dt><dd>${escapeHtml(article.date)}</dd></div>
                <div><dt>Pairs</dt><dd>${article.pairs.length}</dd></div>
                ${
                  article.tagHrefs.length
                    ? `<div>
                        <dt>Tags</dt>
                        <dd class="article-tag-list">
                          ${article.tagHrefs
                            .map(
                              (tag) => `<a href="${escapeHtml(tag.href)}">${escapeHtml(tag.label)}</a>`,
                            )
                            .join("")}
                        </dd>
                      </div>`
                    : ""
                }
              </dl>
            </div>
            ${renderRatioChart(siteStats)}
          </div>
        </header>
        <section class="article-body">
          <div class="article-reading-grid" data-article-layout>
            <article class="article-source-panel editorial-panel">
              <div class="pair-surface-label">Source</div>
              <ol class="source-stream">
                ${article.pairs
                  .map((pair, index) => renderSourceSegment(pair, index))
                  .join("")}
              </ol>
            </article>
            <section class="article-notes-panel">
              <ol class="pair-list pair-stream" data-note-stack>
                ${article.pairs
                  .map((pair, index) => renderPairUnit(pair, index))
                  .join("")}
              </ol>
              <div class="focus-note-layer" data-focus-layer hidden>
                <article class="focus-note-card editorial-panel" data-focus-card></article>
              </div>
            </section>
          </div>
        </section>
      </main>
    `,
  });
}

function renderRatioChart(siteStats) {
  const total = siteStats?.totalArticles || 1;
  const codeCount = siteStats?.articleTypeCounts?.code || 0;
  const mathCount = siteStats?.articleTypeCounts?.math || 0;
  const bars = [
    {
      kind: "code",
      label: "Code",
      percent: Math.round((codeCount / total) * 100),
    },
    {
      kind: "math",
      label: "Math",
      percent: Math.round((mathCount / total) * 100),
    },
  ];

  return `
    <aside class="article-ratio-chart article-ratio-chart--split" aria-label="Site-wide code and math article ratio">
      <div class="article-ratio-header">
        <p class="article-ratio-kicker">Archive Mix</p>
        <p class="article-ratio-total">${total} articles</p>
      </div>
      <div class="article-ratio-band" aria-hidden="true">
        ${bars
          .map(
            (bar) => `
              <span
                class="article-ratio-band-segment"
                data-ratio-kind="${escapeHtml(bar.kind)}"
                style="width:${bar.percent}%"
              ></span>
            `,
          )
          .join("")}
      </div>
      <div class="article-ratio-legend">
        ${bars
          .map(
            (bar) => `
              <div class="article-ratio-legend-item" data-ratio-kind="${escapeHtml(bar.kind)}">
                <span class="article-ratio-dot"></span>
                <span class="article-ratio-label">${escapeHtml(bar.label)}</span>
                <span class="article-ratio-value">${bar.percent}%</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </aside>
  `;
}

function pageShell({ siteTitle, pageTitle, basePath, body }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)} · ${escapeHtml(siteTitle)}</title>
    <link rel="stylesheet" href="${escapeHtml(withBasePath(basePath, "/assets/css/site.css"))}">
    <link rel="stylesheet" href="${escapeHtml(withBasePath(basePath, "/assets/vendor/katex/katex.min.css"))}">
  </head>
  <body>
    ${body}
    <script src="${escapeHtml(withBasePath(basePath, "/assets/js/article.js"))}" defer></script>
  </body>
</html>
`;
}

function renderPairUnit(pair, index) {
  if (!hasCommentary(pair)) {
    return "";
  }

  const badge = String(index + 1).padStart(2, "0");
  const idAttr = pair.id ? `id="${escapeHtml(pair.id)}" data-pair-id="${escapeHtml(pair.id)}"` : "";
  const badgeMarkup = pair.id
    ? `<a class="pair-badge" href="#${escapeHtml(pair.id)}" aria-label="Jump to pair ${badge}">${badge}</a>`
    : `<span class="pair-badge" aria-hidden="true">${badge}</span>`;
  const noteClassName =
    pair.right.length > 240
      ? "pair-note-segment pair-note-segment--compact"
      : "pair-note-segment";

  return `
    <li class="pair-unit" data-pair-index="${index + 1}" data-lock-target="${index + 1}" ${idAttr}>
      <div class="pair-thread">
        ${badgeMarkup}
        <span class="pair-thread-line" aria-hidden="true"></span>
      </div>
      <section class="${noteClassName}" data-note-panel>
        <div class="pair-surface-label">Commentary</div>
        <div class="pair-explanation">${pair.rightHtml}</div>
      </section>
    </li>
  `;
}

function renderSourceSegment(pair, index) {
  const badge = String(index + 1).padStart(2, "0");
  const commentaryAttr = hasCommentary(pair) ? 'data-has-note="true"' : "";
  const sourceClassName =
    pair.left.kind === "math"
      ? `pair-source-segment pair-source-segment--math${hasCommentary(pair) ? " pair-source-segment--annotated" : ""}`
      : `pair-source-segment pair-source-segment--code${hasCommentary(pair) ? " pair-source-segment--annotated" : ""}`;
  const idAttr = pair.id ? `data-pair-id="${escapeHtml(pair.id)}"` : "";
  const lockAttr = hasCommentary(pair) ? `data-lock-target="${index + 1}"` : "";

  return `
    <li class="${sourceClassName}" data-pair-index="${index + 1}" ${lockAttr} ${commentaryAttr} ${idAttr}>
      <div class="pair-source-marker">${badge}</div>
      <div class="pair-source-body">${pair.leftHtml}</div>
    </li>
  `;
}

function hasCommentary(pair) {
  return String(pair.right ?? "").trim() !== "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function withBasePath(basePath, pathname) {
  if (!basePath) {
    return pathname;
  }

  return `${basePath}${pathname}`;
}
