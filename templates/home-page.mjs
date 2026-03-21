export function renderHomePage({ siteTitle, basePath, intro, guides, latest }) {
  return pageShell({
    siteTitle,
    pageTitle: siteTitle,
    basePath,
    body: `
      <main class="page">
        <header class="site-header">
          <h1 class="site-heading">${escapeHtml(siteTitle)}</h1>
          <p class="site-intro">${escapeHtml(intro)}</p>
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
                    </a>
                `,
              )
              .join("")}
          </div>
        </section>
        <section class="home-section editorial-panel">
          <h2>Latest</h2>
          <ol class="card-list">
            ${latest
              .map(
                (article) => `
                  <li>
                    <a href="${escapeHtml(article.href)}">${escapeHtml(article.title)}</a>
                    <span>${escapeHtml(article.date)}</span>
                    <p>${escapeHtml(article.summary ?? "")}</p>
                  </li>
                `,
              )
              .join("")}
          </ol>
        </section>
      </main>
    `,
  });
}

function pageShell({ siteTitle, pageTitle, basePath, body }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)}</title>
    <link rel="stylesheet" href="${escapeHtml(withBasePath(basePath, "/assets/css/site.css"))}">
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
    return `<span class="guide-glyph guide-glyph--math" aria-hidden="true">ƒx</span>`;
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
