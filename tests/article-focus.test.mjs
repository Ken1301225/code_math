import test from "node:test";
import assert from "node:assert/strict";

import {
  pickAutoFocusIndex,
  updateAutoFocusState,
  pickTriggerLineIndex,
} from "../assets/js/article-focus-logic.js";

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

test("pickAutoFocusIndex keeps the active segment while it still overlaps the retention band", () => {
  const index = pickAutoFocusIndex(
    [
      { top: 250, bottom: 350, height: 100 },
      { top: 360, bottom: 460, height: 100 },
    ],
    {
      viewportHeight: 800,
      focusLine: 400,
      activeIndex: 0,
      retainTop: 280,
      retainBottom: 520,
    },
  );

  assert.equal(index, 0);
});

test("pickAutoFocusIndex switches after the active segment leaves the retention band", () => {
  const index = pickAutoFocusIndex(
    [
      { top: 140, bottom: 240, height: 100 },
      { top: 300, bottom: 420, height: 120 },
    ],
    {
      viewportHeight: 800,
      focusLine: 400,
      activeIndex: 0,
      retainTop: 280,
      retainBottom: 520,
    },
  );

  assert.equal(index, 1);
});

test("pickAutoFocusIndex hands off to a short middle segment once it reaches the focus line", () => {
  const index = pickAutoFocusIndex(
    [
      { top: -140, bottom: 300, height: 440 },
      { top: 330, bottom: 430, height: 100 },
      { top: 470, bottom: 790, height: 320 },
    ],
    {
      viewportHeight: 800,
      focusLine: 400,
      activeIndex: 0,
      retainTop: 280,
      retainBottom: 520,
      scrollDirection: 1,
    },
  );

  assert.equal(index, 1);
});

test("pickTriggerLineIndex selects the block containing the trigger line", () => {
  const rects = [
    { top: 0, bottom: 180, height: 180 },
    { top: 181, bottom: 241, height: 60 },
    { top: 242, bottom: 520, height: 278 },
  ];

  const index = pickTriggerLineIndex(rects, {
    viewportHeight: 800,
    focusLine: 430,
  });

  assert.equal(index, 2);
});

test("pickTriggerLineIndex keeps the previous block while the trigger line is between blocks", () => {
  const index = pickTriggerLineIndex(
    [
      { top: -120, bottom: 120, height: 240 },
      { top: 220, bottom: 420, height: 200 },
      { top: 520, bottom: 720, height: 200 },
    ],
    {
      viewportHeight: 800,
      focusLine: 170,
    },
  );

  assert.equal(index, 0);
});

test("pickTriggerLineIndex selects the first visible block when the trigger line is above all visible blocks", () => {
  const index = pickTriggerLineIndex(
    [
      { top: 240, bottom: 380, height: 140 },
      { top: 400, bottom: 620, height: 220 },
    ],
    {
      viewportHeight: 800,
      focusLine: 120,
    },
  );

  assert.equal(index, 0);
});

test("updateAutoFocusState mirrors trigger-line selection", () => {
  const state = updateAutoFocusState(
    [
      { top: -60, bottom: 540, height: 600 },
      { top: 560, bottom: 700, height: 140 },
      { top: 720, bottom: 820, height: 100 },
    ],
    {
      viewportHeight: 800,
      focusLine: 400,
    },
  );

  assert.equal(state.index, 0);
  assert.equal(state.rawIndex, 0);
  assert.equal(state.pendingIndex, -1);
  assert.equal(state.pendingCount, 0);
});

test("pickTriggerLineIndex can select the last block before page bottom once it crosses the trigger line", () => {
  const state = updateAutoFocusState(
    [
      { top: -1000, bottom: 0, height: 1000 },
      { top: -20, bottom: 300, height: 320 },
      { top: 340, bottom: 520, height: 180 },
    ],
    {
      viewportHeight: 800,
      focusLine: 380,
    },
  );

  assert.equal(state.index, 2);
  assert.equal(state.rawIndex, 2);
});

test("pickTriggerLineIndex does not leave a tall active block too early for the next short block", () => {
  const state = updateAutoFocusState(
    [
      { top: -1400, bottom: -1100, height: 300 },
      { top: -1080, bottom: -820, height: 260 },
      { top: -780, bottom: -420, height: 360 },
      { top: -60, bottom: 540, height: 600 },
      { top: 560, bottom: 700, height: 140 },
      { top: 720, bottom: 820, height: 100 },
    ],
    {
      viewportHeight: 800,
      focusLine: 380,
      activeIndex: 3,
      minActivationSpan: 120,
    },
  );

  assert.equal(state.index, 3);
  assert.equal(state.rawIndex, 3);
});
