export function pickAutoFocusIndex(rects, options = {}) {
  if (!Array.isArray(rects) || rects.length === 0) {
    return -1;
  }

  const viewportHeight = options.viewportHeight ?? 0;
  const focusLine = options.focusLine ?? viewportHeight / 2;
  const retainTop = options.retainTop ?? viewportHeight * 0.34;
  const retainBottom = options.retainBottom ?? viewportHeight * 0.68;
  const activeIndex = Number.isInteger(options.activeIndex) ? options.activeIndex : -1;
  const scoredRects = scoreRects(rects, { viewportHeight, focusLine });
  const bestIndex = pickBestIndex(scoredRects, { viewportHeight, focusLine });
  const scrollDirection = Math.sign(Number(options.scrollDirection) || 0);

  const activeRect = scoredRects[activeIndex];
  const activeOverlapsRetentionBand =
    activeRect &&
    activeRect.visibleHeight > 0 &&
    activeRect.bottom > retainTop &&
    activeRect.top < retainBottom;
  const bestRect = scoredRects[bestIndex];
  const shouldPreferFocusLineTakeover =
    bestIndex >= 0 &&
    bestIndex !== activeIndex &&
    bestRect?.coversFocusLine &&
    !activeRect?.coversFocusLine &&
    (
      (scrollDirection > 0 && bestIndex > activeIndex) ||
      (scrollDirection < 0 && bestIndex < activeIndex)
    );

  if (shouldPreferFocusLineTakeover) {
    return bestIndex;
  }

  if (activeOverlapsRetentionBand) {
    return activeIndex;
  }

  return bestIndex;
}

export function updateAutoFocusState(rects, options = {}) {
  if (!Array.isArray(rects) || rects.length === 0) {
    return { index: -1, rawIndex: -1, pendingIndex: -1, pendingCount: 0 };
  }

  const rawIndex = pickTriggerLineIndex(rects, options);

  return { index: rawIndex, rawIndex, pendingIndex: -1, pendingCount: 0 };
}

export function pickTriggerLineIndex(rects, options = {}) {
  if (!Array.isArray(rects) || rects.length === 0) {
    return -1;
  }

  const viewportHeight = options.viewportHeight ?? 0;
  const focusLine = options.focusLine ?? viewportHeight / 2;
  const normalizedRects = normalizeRects(rects);
  const visibleRects = normalizedRects.filter((rect) => (
    viewportHeight > 0
      ? rect.bottom > 0 && rect.top < viewportHeight
      : true
  ));
  const candidates = visibleRects.length ? visibleRects : normalizedRects;

  const containingRect = candidates.find((rect) => (
    rect.top <= focusLine && rect.bottom > focusLine
  ));
  if (containingRect) {
    return containingRect.index;
  }

  let lastAboveIndex = -1;
  for (const rect of candidates) {
    if (rect.bottom <= focusLine) {
      lastAboveIndex = rect.index;
      continue;
    }

    break;
  }

  if (lastAboveIndex >= 0) {
    return lastAboveIndex;
  }

  const firstBelow = candidates.find((rect) => rect.top > focusLine);
  if (firstBelow) {
    return firstBelow.index;
  }

  return candidates[candidates.length - 1]?.index ?? -1;
}

export function pickProgressMappedIndex(rects, options = {}) {
  if (!Array.isArray(rects) || rects.length === 0) {
    return -1;
  }

  const viewportHeight = options.viewportHeight ?? 0;
  const focusLine = options.focusLine ?? viewportHeight / 2;
  const minActivationSpan =
    options.minActivationSpan ??
    Math.max(120, Math.round(Math.max(viewportHeight * 0.14, 0)));
  const maxAnchorOffset = Math.min(72, Math.round(minActivationSpan * 0.5));

  const normalizedRects = rects.map((rect) => ({
    top: rect.top,
    bottom: rect.bottom,
    height: Math.max(rect.height ?? rect.bottom - rect.top, 1),
    activationAnchor:
      rect.top +
      Math.min(
        Math.max((rect.height ?? rect.bottom - rect.top) * 0.35, 24),
        maxAnchorOffset,
      ),
  }));

  if (normalizedRects.length === 1) {
    return 0;
  }

  for (let index = 0; index < normalizedRects.length - 1; index += 1) {
    const leftAnchor = normalizedRects[index].activationAnchor;
    const rightAnchor = normalizedRects[index + 1].activationAnchor;
    const boundary = (leftAnchor + rightAnchor) / 2;

    if (focusLine < boundary) {
      return index;
    }
  }

  return normalizedRects.length - 1;
}

function scoreRects(rects, { viewportHeight, focusLine }) {
  return rects.map((rect, index) => {
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, viewportHeight);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const safeHeight = Math.max(rect.height ?? rect.bottom - rect.top, 1);
    const visibleRatio = visibleHeight / safeHeight;
    const coversFocusLine = rect.top < focusLine && rect.bottom > focusLine;
    const center = rect.top + (rect.height ?? rect.bottom - rect.top) / 2;
    const centerDistance = Math.abs(center - focusLine);

    return {
      index,
      top: rect.top,
      bottom: rect.bottom,
      visibleHeight,
      visibleRatio,
      coversFocusLine,
      centerDistance,
    };
  });
}

function pickBestIndex(scoredRects, { viewportHeight }) {
  const visibleRects = scoredRects.filter((rect) => rect.visibleHeight > 0);
  const candidates = visibleRects.length > 0 ? visibleRects : scoredRects;

  candidates.sort((left, right) => {
    if (left.coversFocusLine !== right.coversFocusLine) {
      return left.coversFocusLine ? -1 : 1;
    }

    if (left.visibleRatio !== right.visibleRatio) {
      return right.visibleRatio - left.visibleRatio;
    }

    if (left.visibleHeight !== right.visibleHeight) {
      return right.visibleHeight - left.visibleHeight;
    }

    if (left.centerDistance !== right.centerDistance) {
      return left.centerDistance - right.centerDistance;
    }

    return right.index - left.index;
  });

  return candidates[0]?.index ?? -1;
}

function normalizeRects(rects) {
  return rects.map((rect, index) => ({
    index,
    top: rect.top,
    bottom: rect.bottom,
    height: Math.max(rect.height ?? rect.bottom - rect.top, 1),
  }));
}
