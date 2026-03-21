export function renderHomePage({ siteTitle, assets, basePath, intro, guides, latest }) {
  const featured = latest[0] ?? null;
  const archive = latest.slice(1, 5);

  return pageShell({
    siteTitle,
    pageTitle: siteTitle,
    assets,
    basePath,
    body: `
      <main class="page home-page">
        <header class="site-header site-hero editorial-panel">
          <div class="site-hero-grid">
            <div class="site-mark-panel">
              <p class="site-kicker">Warm Pixel Research Terminal</p>
              <div class="site-mark" aria-hidden="true">
                <span>C</span>
                <span>&cap;</span>
                <span>M</span>
              </div>
            </div>
            <div class="site-hero-copy">
              <h1 class="site-heading">${escapeHtml(siteTitle)}</h1>
              <p class="site-intro">${escapeHtml(intro)}</p>
            </div>
            <aside class="site-status-panel" aria-label="Site status">
              <p class="site-status-label">Status</p>
              <p>code 03</p>
              <p>math 01</p>
              <p>notes live</p>
            </aside>
          </div>
        </header>
        <section class="home-section home-guide editorial-panel">
          <h2>Guide</h2>
          <div class="guide-strip">
            ${guides
              .map(
                (guide) => `
                    <a
                      class="guide-link guide-link--${escapeHtml(guide.kind ?? "generic")}"
                      href="${escapeHtml(guide.href)}"
                      aria-label="${escapeHtml(renderGuideAriaLabel(guide.kind, guide.label))}"
                      title="${escapeHtml(renderGuideAriaLabel(guide.kind, guide.label))}"
                    >
                      ${renderGuideIcon(guide.kind)}
                      <span class="guide-name sr-only">${escapeHtml(renderGuideAriaLabel(guide.kind, guide.label))}</span>
                    </a>
                `,
              )
              .join("")}
          </div>
        </section>
        <section class="home-section home-archive editorial-panel">
          <div class="home-section-head">
            <h2>Latest Archive</h2>
            <p class="home-section-note">Recent annotated notes, staged like a terminal issue board.</p>
          </div>
          <div class="home-archive-grid">
            ${featured ? renderFeaturedArticle(featured) : ""}
            <ol class="card-list home-card-list">
              ${archive
                .map(
                  (article) => `
                    <li>
                      <p class="card-kicker">${escapeHtml(article.type)} / ${escapeHtml(article.date)}</p>
                      <a href="${escapeHtml(article.href)}">${escapeHtml(article.title)}</a>
                      <p>${escapeHtml(article.summary ?? "")}</p>
                    </li>
                  `,
                )
                .join("")}
            </ol>
          </div>
        </section>
      </main>
    `,
  });
}

function renderFeaturedArticle(article) {
  return `
    <article class="home-featured-card">
      <p class="card-kicker">featured / ${escapeHtml(article.type)} / ${escapeHtml(article.date)}</p>
      <h2><a href="${escapeHtml(article.href)}">${escapeHtml(article.title)}</a></h2>
      <p>${escapeHtml(article.summary ?? "")}</p>
    </article>
  `;
}

function pageShell({ siteTitle, pageTitle, assets, basePath, body }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)}</title>
    <link rel="stylesheet" href="${escapeHtml(withBasePath(basePath, assets.cssHref))}">
  </head>
  <body>
    ${body}
  </body>
</html>
`;
}

function renderGuideIcon(kind) {
  if (kind === "code") {
    return `<span class="guide-glyph guide-glyph--code" aria-hidden="true">&#xf121;</span>`;
  }

  if (kind === "math") {
    return `<span class="guide-glyph guide-glyph--math" aria-hidden="true">&#xf1ec;</span>`;
  }

  return "";
}

function renderGuideAriaLabel(kind, fallback) {
  if (kind === "code") {
    return "Code";
  }

  if (kind === "math") {
    return "Math";
  }

  return fallback ?? "Guide";
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
