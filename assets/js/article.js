import { pickAutoFocusIndex } from "./article-focus-logic.js";

const notePairs = Array.from(document.querySelectorAll(".pair-unit"));
const sourceSegments = Array.from(document.querySelectorAll(".pair-source-segment"));
const annotatedSourceSegments = sourceSegments.filter(
  (segment) => segment.dataset.hasNote === "true",
);
const noteStack = document.querySelector("[data-note-stack]");
const notesPanel = document.querySelector(".article-notes-panel");
const sourcePanel = document.querySelector(".article-source-panel");
const focusLayer = document.querySelector("[data-focus-layer]");
const focusCard = document.querySelector("[data-focus-card]");
const FOCUS_STICKY_TOP = 24;

const notePairByIndex = new Map(notePairs.map((pair) => [pair.dataset.pairIndex, pair]));
const sourceByIndex = new Map(
  annotatedSourceSegments.map((segment) => [segment.dataset.pairIndex, segment]),
);

let activePair = null;
let layoutFrame = 0;
let autoFocusFrame = 0;

function clearSourceHighlights() {
  for (const segment of sourceSegments) {
    segment.classList.remove("is-active");
  }
}

function setFocusCardMarkup(pair) {
  if (!focusCard) {
    return;
  }

  const badgeMarkup = pair.querySelector(".pair-thread")?.innerHTML ?? "";
  const noteMarkup = pair.querySelector("[data-note-panel]")?.outerHTML ?? "";
  focusCard.innerHTML = `
    <div class="pair-thread focus-thread">
      ${badgeMarkup}
    </div>
    ${noteMarkup}
  `;
  focusCard.dataset.pairIndex = pair.dataset.pairIndex ?? "";
}

function setFocusPosition(pair) {
  if (!focusCard || !notesPanel) {
    return;
  }

  const source = sourceByIndex.get(pair.dataset.pairIndex);
  const notePanel = focusCard.querySelector("[data-note-panel]");
  if (!source || !notePanel) {
    return;
  }

  const panelRect = notesPanel.getBoundingClientRect();
  const sourceRect = source.getBoundingClientRect();
  const alignedOffset = Math.max(0, sourceRect.top - panelRect.top);
  const stickyOffset = Math.max(0, FOCUS_STICKY_TOP - panelRect.top);
  const trailingOffset = Math.max(
    alignedOffset,
    sourceRect.bottom - panelRect.top - notePanel.offsetHeight,
  );
  const offset = Math.min(Math.max(stickyOffset, alignedOffset), trailingOffset);

  focusCard.style.setProperty("--focus-offset", `${Math.max(0, offset)}px`);
  const minHeight = Math.max(sourcePanel?.offsetHeight ?? 0, offset + notePanel.offsetHeight);
  notesPanel.style.minHeight = `${minHeight}px`;
}

function resetFocusMode() {
  cancelAnimationFrame(layoutFrame);
  cancelAnimationFrame(autoFocusFrame);
  activePair = null;
  noteStack?.classList.remove("is-hidden");
  focusLayer?.setAttribute("hidden", "");
  focusCard?.style.removeProperty("--focus-offset");
  focusCard?.removeAttribute("data-pair-index");
  notesPanel?.style.removeProperty("min-height");

  for (const pair of notePairs) {
    pair.classList.remove("is-active");
  }

  clearSourceHighlights();
}

function scheduleFocusPosition(pair) {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    if (activePair === pair) {
      setFocusPosition(pair);
    }
  });
}

function applyFocusMode(pair) {
  if (!pair || !focusLayer) {
    return;
  }

  cancelAnimationFrame(layoutFrame);
  activePair = pair;

  for (const item of notePairs) {
    item.classList.toggle("is-active", item === pair);
  }

  clearSourceHighlights();
  pair.classList.add("is-active");
  sourceByIndex.get(pair.dataset.pairIndex)?.classList.add("is-active");
  noteStack?.classList.add("is-hidden");
  focusLayer.removeAttribute("hidden");
  if (focusCard?.dataset.pairIndex !== pair.dataset.pairIndex) {
    setFocusCardMarkup(pair);
  }
  scheduleFocusPosition(pair);
}

function isNearPageBottom() {
  const viewportBottom = window.scrollY + window.innerHeight;
  const documentHeight = Math.max(
    document.documentElement?.scrollHeight ?? 0,
    document.body?.scrollHeight ?? 0,
  );

  return documentHeight - viewportBottom <= 32;
}

function findLastVisiblePair() {
  for (let index = annotatedSourceSegments.length - 1; index >= 0; index -= 1) {
    const segment = annotatedSourceSegments[index];
    const rect = segment.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);

    if (visibleBottom - visibleTop > 0) {
      return notePairByIndex.get(segment.dataset.pairIndex) ?? null;
    }
  }

  return null;
}

function findCenteredPair() {
  if (!annotatedSourceSegments.length) {
    return null;
  }

  if (isNearPageBottom()) {
    return findLastVisiblePair();
  }

  const bestIndex = pickAutoFocusIndex(
    annotatedSourceSegments.map((segment) => {
      const rect = segment.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
      };
    }),
    {
      viewportHeight: window.innerHeight,
      focusLine: window.innerHeight / 2,
    },
  );

  if (bestIndex < 0) {
    return null;
  }

  const segment = annotatedSourceSegments[bestIndex];
  return segment ? notePairByIndex.get(segment.dataset.pairIndex) ?? null : null;
}

function syncAutoFocus() {
  const pair = findCenteredPair();
  if (!pair) {
    resetFocusMode();
    return;
  }

  if (activePair === pair) {
    scheduleFocusPosition(pair);
    return;
  }

  applyFocusMode(pair);
}

function scheduleAutoFocus() {
  cancelAnimationFrame(autoFocusFrame);
  autoFocusFrame = requestAnimationFrame(() => {
    syncAutoFocus();
  });
}

window.addEventListener("resize", () => {
  scheduleAutoFocus();
});

window.addEventListener(
  "scroll",
  () => {
    scheduleAutoFocus();
  },
  { passive: true },
);

if (annotatedSourceSegments.length) {
  scheduleAutoFocus();
}
