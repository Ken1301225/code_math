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

const notePairById = new Map(
  notePairs
    .filter((pair) => pair.dataset.pairId)
    .map((pair) => [pair.dataset.pairId, pair]),
);
const notePairByIndex = new Map(notePairs.map((pair) => [pair.dataset.pairIndex, pair]));
const sourceByIndex = new Map(
  annotatedSourceSegments.map((segment) => [segment.dataset.pairIndex, segment]),
);

let lockedPair = null;
let layoutFrame = 0;

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
  const offset = sourceRect.top - panelRect.top;

  focusCard.style.setProperty("--focus-offset", `${Math.max(0, offset)}px`);
  const minHeight = Math.max(sourcePanel?.offsetHeight ?? 0, offset + notePanel.offsetHeight);
  notesPanel.style.minHeight = `${minHeight}px`;
}

function resetFocusMode() {
  cancelAnimationFrame(layoutFrame);
  lockedPair = null;
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
    if (lockedPair === pair) {
      setFocusPosition(pair);
    }
  });
}

function applyFocusMode(pair, { focus = false } = {}) {
  if (!pair || !focusLayer) {
    return;
  }

  cancelAnimationFrame(layoutFrame);
  lockedPair = pair;

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

  if (focus) {
    sourceByIndex.get(pair.dataset.pairIndex)?.focus?.({ preventScroll: true });
  }
}

function updateHashForPair(pair, { replace = false } = {}) {
  const id = pair?.dataset.pairId;
  if (!id) {
    return;
  }

  const nextHash = `#${encodeURIComponent(id)}`;
  if (replace) {
    history.replaceState(null, "", nextHash);
  } else if (window.location.hash !== nextHash) {
    history.pushState(null, "", nextHash);
  }
}

function clearHash() {
  if (!window.location.hash) {
    return;
  }

  history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

function toggleFocus(pair, options = {}) {
  if (!pair) {
    return;
  }

  if (lockedPair === pair) {
    resetFocusMode();
    clearHash();
    return;
  }

  applyFocusMode(pair, options);
  updateHashForPair(pair, { replace: options.replace ?? false });
}

function syncHashFocus({ focus = false } = {}) {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) {
    resetFocusMode();
    return;
  }

  const pair = notePairById.get(id);
  if (!pair) {
    return;
  }

  applyFocusMode(pair, { focus });
}

for (const pair of notePairs) {
  pair.addEventListener("click", (event) => {
    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    toggleFocus(pair);
  });
}

for (const segment of annotatedSourceSegments) {
  segment.tabIndex = 0;

  segment.addEventListener("click", () => {
    const pair = notePairByIndex.get(segment.dataset.pairIndex);
    toggleFocus(pair);
  });

  segment.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    const pair = notePairByIndex.get(segment.dataset.pairIndex);
    toggleFocus(pair, { focus: true });
  });
}

document.addEventListener("click", (event) => {
  if (!lockedPair) {
    return;
  }

  const target = event.target;
  if (
    target instanceof Element &&
    (target.closest(".pair-source-segment") ||
      target.closest(".pair-unit") ||
      target.closest("[data-focus-card]"))
  ) {
    return;
  }

  resetFocusMode();
  clearHash();
});

window.addEventListener("resize", () => {
  if (lockedPair) {
    scheduleFocusPosition(lockedPair);
  }
});

window.addEventListener("hashchange", () => {
  syncHashFocus();
});

syncHashFocus();
