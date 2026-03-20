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
\mathbb{E}[R_T] \le \sum_{t=1}^{T} \frac{1}{\eta_t} + \eta_t \lVert g_t \rVert^2
$$

This separates the inverse learning-rate term from the gradient penalty term.
:::

