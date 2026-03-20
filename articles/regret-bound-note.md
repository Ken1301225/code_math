---
title: Regret Bound Walkthrough
slug: regret-bound-note
date: 2026-03-20
type: math
tags:
  - bandit
  - proof
summary: Split the regret upper bound into interpretable pieces.
---

:::pair id=bound
$$
\mathbb{E}[R_T]
\le
\frac{\log T}{\eta}
+ \eta \sum_{t=1}^{T} \lVert g_t \rVert^2
$$

The bound separates two competing effects: smaller learning rates shrink the gradient
penalty, while larger learning rates reduce the log term. The annotation makes the
tradeoff explicit instead of leaving the inequality as a single opaque line.
:::
