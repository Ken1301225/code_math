export function renderListingPage({ siteTitle, assets, basePath, title, intro, backHref, articles }) {
  return pageShell({
    siteTitle,
    pageTitle: title,
    assets,
    basePath,
    body: `
      <main class="page listing-page">
        <header class="site-header">
          <p><a href="${escapeHtml(backHref)}">Home</a></p>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(intro)}</p>
        </header>
        <section class="listing-section editorial-panel">
          <ol class="card-list">
          ${articles
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

function pageShell({ siteTitle, pageTitle, assets, basePath, body }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)} · ${escapeHtml(siteTitle)}</title>
    <link rel="stylesheet" href="${escapeHtml(withBasePath(basePath, assets.cssHref))}">
  </head>
  <body>
    ${body}
  </body>
</html>
`;
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
