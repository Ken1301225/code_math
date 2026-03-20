export function renderHomePage({ siteTitle, basePath, intro, guides, latest }) {
  return pageShell({
    siteTitle,
    pageTitle: siteTitle,
    basePath,
    body: `
      <main class="page">
        <header class="site-header">
          <h1>${escapeHtml(siteTitle)}</h1>
          <p class="site-intro">${escapeHtml(intro)}</p>
        </header>
        <section class="home-section editorial-panel">
          <h2>Guide</h2>
          <ul class="card-list">
            ${guides
              .map(
                (guide) => `
                  <li>
                    <a class="guide-link guide-link--${escapeHtml(guide.kind ?? "generic")}" href="${escapeHtml(guide.href)}">
                      ${renderGuideIcon(guide.kind)}
                      <span>${escapeHtml(guide.label)}</span>
                    </a>
                  </li>
                `,
              )
              .join("")}
          </ul>
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
    return `
      <svg class="guide-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6 4 12l5 6M15 6l5 6-5 6M13 4l-2 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>
      </svg>
    `;
  }

  if (kind === "math") {
    return `
      <svg class="guide-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6h12M8 18h8M7 6l4.5 6L7 18M17 6l-4.5 6L17 18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>
      </svg>
    `;
  }

  return "";
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
