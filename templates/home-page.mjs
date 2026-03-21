export function renderHomePage({ siteTitle, assets, basePath, intro, guides, latest, siteStats }) {
  const featured = latest.find((article) => String(article.summary ?? "").trim()) ?? latest[0] ?? null;
  const archive = latest.filter((article) => article !== featured).slice(0, 4);
  const codeCount = latest.filter((article) => article.type === "code").length;
  const mathCount = latest.filter((article) => article.type === "math").length;
  const totalArticles = siteStats?.totalArticles ?? latest.length;
  const totalPairs = siteStats?.totalPairs ?? latest.reduce((sum, article) => sum + article.pairs.length, 0);
  const projectGroups = (siteStats?.projectGroups ?? []).slice(0, 6);
  const maxProjectCount = Math.max(...projectGroups.map((item) => item.count), 1);
  const tagSpectrum = (siteStats?.tagCounts ?? []).slice(0, 5);
  const maxTagCount = Math.max(...tagSpectrum.map((item) => item.count), 1);
  const activity = siteStats?.activityByDate ?? [];
  const maxActivityCount = Math.max(...activity.map((item) => item.count), 1);

  return pageShell({
    siteTitle,
    pageTitle: siteTitle,
    assets,
    basePath,
    body: `
      <main class="page home-page">
        <header class="site-header site-hero editorial-panel">
          <div class="site-hero-grid">
            <section class="site-hero-copy">
              <div class="site-mark-panel">
                <p class="site-kicker">Research Terminal</p>
                <div class="site-mark" aria-hidden="true">
                  <span>C</span>
                  <span>&cap;</span>
                  <span>M</span>
                </div>
              </div>
              <h1 class="site-heading">${escapeHtml(siteTitle)}</h1>
              <p class="site-intro">${escapeHtml(intro)}</p>
              <div class="site-summary-strip" aria-label="Site summary">
                <div class="summary-chip">
                  <span class="summary-label">articles</span>
                  <strong>${String(totalArticles).padStart(2, "0")}</strong>
                </div>
                <div class="summary-chip">
                  <span class="summary-label">pairs</span>
                  <strong>${String(totalPairs).padStart(2, "0")}</strong>
                </div>
                <div class="summary-chip">
                  <span class="summary-label">clusters</span>
                  <strong>${String(projectGroups.length).padStart(2, "0")}</strong>
                </div>
                <div class="summary-chip">
                  <span class="summary-label">tags</span>
                  <strong>${String(tagSpectrum.length).padStart(2, "0")}</strong>
                </div>
              </div>
              <aside class="site-status-panel" aria-label="Site status">
                <p class="site-status-label">Status</p>
                <p>code ${String(codeCount).padStart(2, "0")}</p>
                <p>math ${String(mathCount).padStart(2, "0")}</p>
                <p>notes live</p>
              </aside>
            </section>
            <section class="site-metrics-grid">
              <article class="stat-panel project-map-panel">
                <div class="stat-head">
                  <h2>Theme Map</h2>
                  <p>${projectGroups.length} active clusters</p>
                </div>
                <div class="project-map-grid">
                  ${projectGroups
                    .map((group) => renderProjectCell(group, maxProjectCount))
                    .join("")}
                </div>
              </article>
              <article class="stat-panel tag-spectrum-panel">
                <div class="stat-head">
                  <h2>Tag Spectrum</h2>
                  <p>top ${tagSpectrum.length} tags</p>
                </div>
                <div class="tag-spectrum-list">
                  ${tagSpectrum
                    .map((item) => renderTagSpectrumItem(item, maxTagCount))
                    .join("")}
                </div>
              </article>
              <article class="stat-panel activity-panel">
                <div class="stat-head">
                  <h2>Release Pulse</h2>
                  <p>recent update cadence</p>
                </div>
                <div class="activity-bars">
                  ${activity
                    .map((item) => renderActivityBar(item, maxActivityCount))
                    .join("")}
                </div>
              </article>
            </section>
          </div>
        </header>
        <section class="home-section home-guide editorial-panel">
          <div class="home-section-head">
            <h2>Guide</h2>
            <p class="home-section-note">Direct entry rails for code and math reading.</p>
          </div>
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
            <h2>Archive Board</h2>
            <p class="home-section-note">Recent notes ranked by pair density and grouped into a compact board.</p>
          </div>
          <div class="archive-board">
            ${featured ? renderFeaturedArchive(featured, archive) : ""}
            <div class="archive-side">
              <div class="archive-density-chart">
                ${[featured, ...archive]
                  .filter(Boolean)
                  .map((article) => renderArchiveDensityBar(article, featured, archive))
                  .join("")}
              </div>
              <ol class="archive-rank-list">
                ${archive
                  .map((article, index) => renderArchiveRankItem(article, index + 2))
                  .join("")}
              </ol>
            </div>
          </div>
        </section>
      </main>
    `,
  });
}

function renderProjectCell(group, maxProjectCount) {
  const span = Math.min(3, Math.max(1, Math.round((group.count / maxProjectCount) * 3)));
  const mixCode = group.typeMix.code;
  const mixMath = group.typeMix.math;

  return `
    <article
      class="project-map-cell"
      data-project-name="${escapeHtml(group.name)}"
      style="--project-span:${span};--project-fill:${(group.count / maxProjectCount).toFixed(3)}"
    >
      <p class="project-map-label">${escapeHtml(formatProjectName(group.name))}</p>
      <p class="project-map-value">${String(group.count).padStart(2, "0")}</p>
      <div class="project-map-meta">
        <span>pairs ${String(group.pairCount).padStart(2, "0")}</span>
        <span>c${mixCode} / m${mixMath}</span>
      </div>
    </article>
  `;
}

function renderTagSpectrumItem(item, maxTagCount) {
  return `
    <div class="tag-spectrum-item">
      <span class="tag-spectrum-label">${escapeHtml(item.tag)}</span>
      <span class="tag-spectrum-bar">
        <span
          class="tag-spectrum-fill"
          style="--tag-fill:${(item.count / maxTagCount).toFixed(3)};--tag-color:${escapeHtml(item.color)}"
        ></span>
      </span>
      <span class="tag-spectrum-value">${String(item.count).padStart(2, "0")}</span>
    </div>
  `;
}

function renderActivityBar(item, maxActivityCount) {
  return `
    <div class="activity-bar">
      <span
        class="activity-bar-fill"
        style="--activity-fill:${(item.count / maxActivityCount).toFixed(3)}"
      ></span>
      <span class="activity-bar-date">${escapeHtml(item.date.slice(5))}</span>
      <span class="activity-bar-value">${item.count}</span>
    </div>
  `;
}

function renderFeaturedArchive(article, archive) {
  const maxPairs = Math.max(article.pairs.length, ...archive.map((item) => item.pairs.length), 1);
  const projectName = formatProjectName(article.routeSegments.slice(0, -1).join("/") || "root");

  return `
    <article class="archive-feature">
      <p class="card-kicker">featured / ${escapeHtml(article.type)} / ${escapeHtml(article.date)}</p>
      <h2><a href="${escapeHtml(article.href)}">${escapeHtml(article.title)}</a></h2>
      <p class="archive-feature-summary">${escapeHtml(article.summary ?? "")}</p>
      <div class="archive-feature-meta">
        <span>cluster ${escapeHtml(projectName)}</span>
        <span>pairs ${String(article.pairs.length).padStart(2, "0")}</span>
        <span>tags ${String(article.tags.length).padStart(2, "0")}</span>
      </div>
      <div class="archive-feature-meter">
        <span
          class="archive-feature-fill"
          style="--archive-fill:${(article.pairs.length / maxPairs).toFixed(3)}"
        ></span>
      </div>
    </article>
  `;
}

function renderArchiveDensityBar(article, featured, archive) {
  const maxPairs = Math.max(
    ...(featured ? [featured.pairs.length] : []),
    ...archive.map((item) => item.pairs.length),
    1,
  );

  return `
    <div class="archive-density-bar">
      <span
        class="archive-density-fill"
        style="--density-fill:${(article.pairs.length / maxPairs).toFixed(3)}"
      ></span>
      <span class="archive-density-name">${escapeHtml(article.title)}</span>
    </div>
  `;
}

function renderArchiveRankItem(article, rank) {
  const projectName = formatProjectName(article.routeSegments.slice(0, -1).join("/") || "root");

  return `
    <li class="archive-rank-item">
      <span class="archive-rank-index">${String(rank).padStart(2, "0")}</span>
      <div class="archive-rank-copy">
        <p class="card-kicker">${escapeHtml(article.type)} / ${escapeHtml(article.date)} / ${escapeHtml(projectName)}</p>
        <a href="${escapeHtml(article.href)}">${escapeHtml(article.title)}</a>
        <p>${escapeHtml(article.summary ?? "")}</p>
      </div>
      <span class="archive-rank-pairs">${String(article.pairs.length).padStart(2, "0")}</span>
    </li>
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

function formatProjectName(name) {
  return name === "root" ? "root" : name;
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
