export function renderHomePage({ siteTitle, assets, basePath, intro, guides, latest, siteStats }) {
  const codeCount = latest.filter((article) => article.type === "code").length;
  const mathCount = latest.filter((article) => article.type === "math").length;
  const totalArticles = siteStats?.totalArticles ?? latest.length;
  const totalPairs = siteStats?.totalPairs ?? latest.reduce((sum, article) => sum + article.pairs.length, 0);
  const projectGroups = (siteStats?.projectGroups ?? []).slice(0, 6);
  const tagSpectrum = (siteStats?.tagCounts ?? []).slice(0, 5);
  const maxTagCount = Math.max(...tagSpectrum.map((item) => item.count), 1);
  const activityHeatmap = siteStats?.activityHeatmap ?? { startDate: "", endDate: "", weeks: [] };

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
              ${renderModeBalance({ codeCount, mathCount, totalPairs })}
            </section>
            <section class="site-metrics-grid">
              <article class="stat-panel theme-map-panel">
                <div class="stat-head">
                  <h2>Theme Map</h2>
                  <p>${projectGroups.length} active clusters</p>
                </div>
                <div class="cluster-ledger">
                  ${projectGroups
                    .map((group) => renderClusterRow(group))
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
                  <p>last 30 days</p>
                </div>
                ${renderActivityHeatmap(activityHeatmap)}
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
            <p class="home-section-note">Recent notes arranged directly in reverse chronological order.</p>
          </div>
          <ol class="archive-timeline">
            ${latest
              .map((article, index) => renderArchiveTimelineItem(article, index + 1))
              .join("")}
          </ol>
        </section>
      </main>
    `,
  });
}

function renderModeBalance({ codeCount, mathCount, totalPairs }) {
  const totalTypes = Math.max(codeCount + mathCount, 1);
  const codeShare = (codeCount / totalTypes).toFixed(3);
  const mathShare = (mathCount / totalTypes).toFixed(3);

  return `
    <aside class="mode-balance-panel" aria-label="Mode balance">
      <div class="mode-balance-head">
        <p class="mode-balance-kicker">Mode Balance</p>
        <p class="mode-balance-total">${String(codeCount + mathCount).padStart(2, "0")} notes</p>
      </div>
      <div class="mode-balance-track" aria-hidden="true">
        <span class="mode-balance-segment mode-balance-segment--code" style="--mode-share:${codeShare}"></span>
        <span class="mode-balance-segment mode-balance-segment--math" style="--mode-share:${mathShare}"></span>
      </div>
      <dl class="mode-balance-meta">
        <div class="mode-balance-item">
          <dt>code</dt>
          <dd>${String(codeCount).padStart(2, "0")}</dd>
        </div>
        <div class="mode-balance-item">
          <dt>math</dt>
          <dd>${String(mathCount).padStart(2, "0")}</dd>
        </div>
        <div class="mode-balance-item">
          <dt>pairs</dt>
          <dd>${String(totalPairs).padStart(2, "0")}</dd>
        </div>
      </dl>
    </aside>
  `;
}

function renderClusterRow(group) {
  const mixCode = group.typeMix.code;
  const mixMath = group.typeMix.math;
  const total = Math.max(mixCode + mixMath, 1);

  return `
    <article class="cluster-row" data-project-name="${escapeHtml(group.name)}">
      <div class="cluster-row-head">
        <p class="cluster-row-name">${escapeHtml(formatProjectName(group.name))}</p>
        <p class="cluster-row-count">${String(group.count).padStart(2, "0")} notes</p>
      </div>
      <div class="cluster-row-meter" aria-hidden="true">
        <span class="cluster-row-segment cluster-row-segment--code" style="--cluster-share:${(mixCode / total).toFixed(3)}"></span>
        <span class="cluster-row-segment cluster-row-segment--math" style="--cluster-share:${(mixMath / total).toFixed(3)}"></span>
      </div>
      <div class="cluster-row-meta">
        <span>pairs ${String(group.pairCount).padStart(2, "0")}</span>
        <span>code ${String(mixCode).padStart(2, "0")}</span>
        <span>math ${String(mixMath).padStart(2, "0")}</span>
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

function renderActivityHeatmap(activityHeatmap) {
  const startLabel = activityHeatmap.startDate ? formatHeatmapDate(activityHeatmap.startDate) : "Start";
  const endLabel = activityHeatmap.endDate ? formatHeatmapDate(activityHeatmap.endDate) : "End";

  return `
    <div class="activity-heatmap">
      <div class="activity-heatmap-range" aria-label="Heatmap date range">
        <span class="activity-heatmap-date">${escapeHtml(startLabel)}</span>
        <span class="activity-heatmap-date activity-heatmap-date--end">${escapeHtml(endLabel)}</span>
      </div>
      <div class="activity-heatmap-shell">
        <div class="activity-heatmap-grid" aria-label="Activity heatmap for the last 30 days">
          ${activityHeatmap.weeks
            .map(
              (week) => `
                <div class="activity-heatmap-week">
                  ${week.days.map((day) => renderActivityCell(day)).join("")}
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderActivityCell(day) {
  if (!day || day.isPadding) {
    return `<span class="activity-cell activity-cell--padding" aria-hidden="true"></span>`;
  }

  return `
    <span
      class="activity-cell activity-cell--level-${day.level}"
      data-activity-date="${escapeHtml(day.date)}"
      data-activity-count="${day.count}"
      title="${escapeHtml(`${day.date} · ${day.count} updates`)}"
      aria-label="${escapeHtml(`${day.date}, ${day.count} updates`)}"
    ></span>
  `;
}

function renderArchiveTimelineItem(article, rank) {
  const projectName = formatProjectName(article.routeSegments.slice(0, -1).join("/") || "root");

  return `
    <li class="archive-timeline-item">
      <span class="archive-timeline-index">${String(rank).padStart(2, "0")}</span>
      <div class="archive-timeline-copy">
        <p class="card-kicker">${escapeHtml(article.date)} / ${escapeHtml(article.type)} / ${escapeHtml(projectName)}</p>
        <a href="${escapeHtml(article.href)}">${escapeHtml(article.title)}</a>
        <p>${escapeHtml(article.summary ?? "")}</p>
      </div>
      <div class="archive-timeline-meta">
        <span>pairs ${String(article.pairs.length).padStart(2, "0")}</span>
        <span>tags ${String(article.tags.length).padStart(2, "0")}</span>
      </div>
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

function renderGuideAriaLabel(kind, fallbackLabel) {
  if (kind === "code") {
    return "Code";
  }

  if (kind === "math") {
    return "Math";
  }

  return fallbackLabel ?? "Guide";
}

function renderGuideIcon(kind) {
  if (kind === "code") {
    return `<span class="guide-glyph guide-glyph--code" aria-hidden="true">&#xf121;</span>`;
  }

  if (kind === "math") {
    return `<span class="guide-glyph guide-glyph--math" aria-hidden="true">&#xf1ec;</span>`;
  }

  return `<span class="guide-glyph" aria-hidden="true">&#xf0c1;</span>`;
}

function formatProjectName(name) {
  return name
    .split("/")
    .filter(Boolean)
    .join(" / ");
}

function formatHeatmapDate(value) {
  const [year, month, day] = String(value).split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthLabel = monthNames[Math.max(0, Number.parseInt(month, 10) - 1)] ?? month;
  return `${monthLabel} ${day}, ${year}`;
}
