export function pickAutoFocusIndex(rects, options = {}) {
  if (!Array.isArray(rects) || rects.length === 0) {
    return -1;
  }

  const viewportHeight = options.viewportHeight ?? 0;
  const focusLine = options.focusLine ?? viewportHeight / 2;

  const scoredRects = rects.map((rect, index) => {
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, viewportHeight);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const safeHeight = Math.max(rect.height ?? rect.bottom - rect.top, 1);
    const visibleRatio = visibleHeight / safeHeight;
    const coversFocusLine = rect.top <= focusLine && rect.bottom >= focusLine;
    const center = rect.top + (rect.height ?? rect.bottom - rect.top) / 2;
    const centerDistance = Math.abs(center - focusLine);

    return {
      index,
      visibleHeight,
      visibleRatio,
      coversFocusLine,
      centerDistance,
    };
  });

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
