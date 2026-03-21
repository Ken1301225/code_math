---
title: 单调队列窗口最大值
slug: monotonic-queue-note
date: 2026-03-20
type: code
tags:
  - algorithm
  - monotonic-queue
  - sliding-window
summary: 用三个配对片段解释为什么双端队列能在线性时间里维护窗口最大值。
links:
  - "[Sliding window technique](https://en.wikipedia.org/wiki/Sliding_window_protocol)"
---

:::pair id=seed-window
```python
from collections import deque

def max_sliding_window(nums, k):
    window = deque()
    answer = []
```

这一步只创建两个状态，但已经把算法的职责分清了。

`window` 不直接存值，而是存下标。这样队首既能代表当前最大值的位置，又能判断它是否已经滑出窗口。
`answer` 只在窗口真正形成后追加结果，所以整段流程保持单向扫描，不需要回头补算。

如果把窗口右端记作 $r$，那么任何时刻我们只关心区间 $[r-k+1, r]$ 内仍然有效的候选下标。
:::

:::pair id=prune-tail
```python
    for right, value in enumerate(nums):
        while window and nums[window[-1]] <= value:
            window.pop()
        window.append(right)
```

这里是单调队列的核心不变量: 队列里的下标按出现顺序排列，而对应的数值严格单调递减。

当新的 `value` 更大时，队尾那些更小或相等的元素以后都不可能再成为窗口最大值，因为它们更早进入窗口、也会更早离开窗口，于是可以立刻删除。这个“删掉无效候选”的动作让每个元素最多进队一次、出队一次，所以总复杂度仍然是 $O(n)$。

从阅读体验上看，这类代码如果只写在普通博客里，读者很容易知道“要 pop”，却不确定“为什么现在就可以 pop”。右侧批注正好用来把那个隐含的不变量说透。
:::

:::pair id=emit-answer
```python
        if window[0] <= right - k:
            window.popleft()
        if right + 1 >= k:
            answer.append(nums[window[0]])

    return answer
```

第一行负责清理已经离开窗口左边界的下标。条件 `window[0] <= right - k` 看起来像一个边角细节，其实它和前面的“存下标而不是存值”是同一个设计决策的延伸。

当 `right + 1 >= k` 时，长度为 `k` 的窗口第一次完整出现，队首也就成为这个窗口的最大值。此后每向右移动一步，我们都重复同样的三件事: 删除过期元素、维护单调性、读取队首答案。

最终的节奏非常稳定: 每个配对块都对应一个局部规则，而这正是 `code_math` 这种左代码右批注布局最适合呈现的内容。
:::
