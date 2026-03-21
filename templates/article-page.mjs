export function renderArticlePage({ siteTitle, basePath, article, siteStats }) {
  const pairViews = buildPairViews(article.pairs);

  return pageShell({
    siteTitle,
    pageTitle: article.title,
    basePath,
    body: `
      <main class="page article-page article-page--${escapeHtml(article.type)}">
        <header class="article-masthead editorial-panel">
          <div class="article-masthead-body">
            <div class="article-masthead-main">
              <div class="article-masthead-topline">
                <p class="article-kicker"><a href="${escapeHtml(withBasePath(basePath, "/"))}">Home</a></p>
                <p class="article-type-pill"><a href="${escapeHtml(article.typeHref)}">${escapeHtml(article.type)}</a></p>
              </div>
              <div class="article-hero-grid">
                <div class="article-heading">
                  <h1>${escapeHtml(article.title)}</h1>
                  ${article.summary ? `<p class="article-summary">${escapeHtml(article.summary)}</p>` : ""}
                </div>
              </div>
              ${renderMetaStrip(article)}
            </div>
            <div class="article-chart-stack">
              ${renderTagChart(siteStats)}
            </div>
          </div>
        </header>
        <section class="article-body">
          <div class="article-reading-grid" data-article-layout>
            <article class="article-source-panel editorial-panel">
              <div class="pair-surface-label">Source</div>
              <ol class="source-stream">
                ${pairViews
                  .map((pairView) => renderSourceSegment(pairView))
                  .join("")}
              </ol>
            </article>
            <section class="article-notes-panel">
              <ol class="pair-list pair-stream" data-note-stack>
                ${pairViews
                  .map((pairView) => renderPairUnit(pairView))
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

function buildPairViews(pairs) {
  let annotatedIndex = 0;

  return pairs.map((pair) => {
    if (!hasCommentary(pair)) {
      return {
        pair,
        annotatedIndex: null,
      };
    }

    annotatedIndex += 1;

    return {
      pair,
      annotatedIndex,
    };
  });
}

function renderMetaStrip(article) {
  const chips = [
    article.links.length
      ? `
        <div class="article-meta-chip article-meta-chip--links">
          <dt>Links</dt>
          <dd class="article-link-list">
            ${article.links.map((link) => renderMetaAnchor(link)).join("")}
          </dd>
        </div>
      `
      : "",
    article.tagHrefs.length
      ? `
        <div class="article-meta-chip article-meta-chip--tags">
          <dt>Tags</dt>
          <dd class="article-tag-list">
            ${article.tagHrefs.map((tag) => renderMetaAnchor(tag)).join("")}
          </dd>
        </div>
      `
      : "",
    `
      <div class="article-meta-chip">
        <dt>Date</dt>
        <dd>${escapeHtml(article.date)}</dd>
      </div>
    `,
    `
      <div class="article-meta-chip">
        <dt>Pairs</dt>
        <dd>${article.pairs.length}</dd>
      </div>
    `,
  ].filter(Boolean);

  return `<dl class="article-meta article-meta-strip">${chips.join("")}</dl>`;
}

function renderMetaAnchor(link) {
  const externalAttrs = /^https?:\/\//i.test(link.href)
    ? ' target="_blank" rel="noreferrer"'
    : "";

  return `<a href="${escapeHtml(link.href)}"${externalAttrs}>${escapeHtml(link.label)}</a>`;
}

function renderTagChart(siteStats) {
  const tagCounts = siteStats?.tagCounts ?? [];
  if (!tagCounts.length) {
    return "";
  }

  const total = siteStats?.totalTagAssignments || 1;
  let offset = 0;
  const slices = tagCounts.map((item) => {
    const start = offset;
    const span = total ? (item.count / total) * 100 : 0;
    offset += span;
    return {
      ...item,
      start,
      end: offset,
    };
  });
  const gradient = slices
    .map((slice) => `${slice.color} ${slice.start.toFixed(2)}% ${slice.end.toFixed(2)}%`)
    .join(", ");
  const legendItems = buildTagLegendItems(slices);

  return `
    <aside class="article-tag-chart article-tag-chart--pie" aria-label="Site-wide tag distribution">
      <div class="article-ratio-header">
        <p class="article-ratio-kicker">Tag Spread</p>
        <p class="article-ratio-total">${total} tag hits</p>
      </div>
      <div class="article-tag-chart-body">
        <div class="article-tag-pie" style="--tag-chart-fill:${escapeHtml(gradient)}" aria-hidden="true"></div>
        <div class="article-tag-legend">
          ${legendItems
            .map(
              (slice) => `
                <div class="article-tag-legend-item" data-tag-name="${escapeHtml(slice.tag)}">
                  <span class="article-tag-swatch" style="--tag-swatch:${escapeHtml(slice.color ?? "transparent")}"></span>
                  <span class="article-tag-label">${escapeHtml(slice.tag)}</span>
                  <span class="article-tag-value">${slice.count ?? ""}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </aside>
  `;
}

function buildTagLegendItems(tagCounts) {
  if (tagCounts.length <= 5) {
    return tagCounts;
  }

  return [
    ...tagCounts.slice(0, 5),
    {
      tag: "...",
      count: "",
      color: "transparent",
    },
  ];
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
    <script type="module" src="${escapeHtml(withBasePath(basePath, "/assets/js/article.js"))}"></script>
  </body>
</html>
`;
}

function renderPairUnit(pairView) {
  const { pair, annotatedIndex } = pairView;
  if (!hasCommentary(pair)) {
    return "";
  }

  const badge = String(annotatedIndex).padStart(2, "0");
  const idAttr = pair.id ? `id="${escapeHtml(pair.id)}" data-pair-id="${escapeHtml(pair.id)}"` : "";
  const badgeMarkup = pair.id
    ? `<a class="pair-badge" href="#${escapeHtml(pair.id)}" aria-label="Jump to pair ${badge}">${badge}</a>`
    : `<span class="pair-badge" aria-hidden="true">${badge}</span>`;
  const noteClassName =
    pair.right.length > 240
      ? "pair-note-segment pair-note-segment--compact"
      : "pair-note-segment";

  return `
    <li class="pair-unit" data-pair-index="${annotatedIndex}" ${idAttr}>
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

function renderSourceSegment(pairView) {
  const { pair, annotatedIndex } = pairView;
  const commentaryAttr = annotatedIndex ? 'data-has-note="true"' : "";
  const sourceClassName =
    pair.left.kind === "math"
      ? `pair-source-segment pair-source-segment--math${annotatedIndex ? " pair-source-segment--annotated" : ""}`
      : `pair-source-segment pair-source-segment--code${annotatedIndex ? " pair-source-segment--annotated" : ""}`;
  const idAttr = pair.id ? `data-pair-id="${escapeHtml(pair.id)}"` : "";
  const indexAttr = annotatedIndex ? `data-pair-index="${annotatedIndex}"` : "";
  const markerClassName = annotatedIndex
    ? "pair-source-marker"
    : "pair-source-marker pair-source-marker--silent";
  const badge = annotatedIndex ? String(annotatedIndex).padStart(2, "0") : "";

  return `
    <li class="${sourceClassName}" ${indexAttr} ${commentaryAttr} ${idAttr}>
      <div class="${markerClassName}">${badge}</div>
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
