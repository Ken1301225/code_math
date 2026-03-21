import test from "node:test";
import assert from "node:assert/strict";

import { pickAutoFocusIndex } from "../assets/js/article-focus-logic.js";

test("pickAutoFocusIndex prefers the segment covering the viewport focus line", () => {
  const index = pickAutoFocusIndex(
    [
      { top: -120, bottom: 120, height: 240 },
      { top: 180, bottom: 520, height: 340 },
      { top: 560, bottom: 900, height: 340 },
    ],
    { viewportHeight: 800 },
  );

  assert.equal(index, 1);
});

test("pickAutoFocusIndex can select the last visible segment near the page end", () => {
  const index = pickAutoFocusIndex(
    [
      { top: -280, bottom: 180, height: 460 },
      { top: 210, bottom: 390, height: 180 },
    ],
    { viewportHeight: 400 },
  );

  assert.equal(index, 1);
});
