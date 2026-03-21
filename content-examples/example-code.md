---
title: Prefix Sum Walkthrough
slug: prefix-sum-note
date: 2026-03-20
type: code
tags:
  - algorithm
  - prefix-sum
summary: Explain why prefix sums start with a sentinel zero.
links:
  - "[Prefix sum overview](https://en.wikipedia.org/wiki/Prefix_sum)"
---

:::pair id=intro
```python
def solve(nums):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
```

The sentinel zero makes interval subtraction uniform.
:::
