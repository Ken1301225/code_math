---
title: Prefix Sum Walkthrough
slug: prefix-sum-note
date: 2026-03-20
type: code
tags:
  - algorithm
  - prefix-sum
summary: Explain why prefix sums start with a sentinel zero.
---

:::pair id=intro
```python
def range_sum(prefix, left, right):
    return prefix[right + 1] - prefix[left]

nums = [3, 1, 4, 1, 5]
prefix = [0]
for value in nums:
    prefix.append(prefix[-1] + value)
```

The extra zero at the front keeps every interval query on the same subtraction pattern.
That means the formula never needs a branch for the first element, and the code stays
close to the math.
:::
