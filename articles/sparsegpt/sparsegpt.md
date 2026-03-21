---
title: sparsegpt核心代码解析
slug: sparsegpt/sparsegpt.py
date: 2026-03-20
type: code
tags:
  - "llm"
summary: sparsegpt的核心方法和类函数, 深度解析其中的add_batch和fastprune方法
links: 
   - "[IST-DASLab/sparsegpt.](https://github.com/IST-DASLab/sparsegpt)"
---
:::pair 
```python
import math
import time

import torch
import torch.nn as nn
import transformers

from quant import *


DEBUG = False 

torch.backends.cuda.matmul.allow_tf32 = False
torch.backends.cudnn.allow_tf32 = False
```
:::


:::pair 
```python
class SparseGPT:

    def __init__(self, layer):
        self.layer = layer
        self.dev = self.layer.weight.device
        W = layer.weight.data.clone()
        if isinstance(self.layer, nn.Conv2d):
            W = W.flatten(1)
        if isinstance(self.layer, transformers.Conv1D):
            W = W.t()
        self.rows = W.shape[0]
        self.columns = W.shape[1]
        self.H = torch.zeros((self.columns, self.columns), device=self.dev)
        self.nsamples = 0
```
    
把权重统一为\[out_dim,in_dim\]的形式, 方便后续继续处理
:::

:::pair
```python
    def add_batch(self, inp, out, blocksize=1024):
        """
        添加batch, 滑动累计产生H矩阵
        """        
        if DEBUG:
            self.inp1 = inp
            self.out1 = out
        if len(inp.shape) == 2:
            inp = inp.unsqueeze(0)
        tmp = inp.shape[0] # batchsize, n_sample为累计的样本数
        if isinstance(self.layer, nn.Linear) or isinstance(self.layer, transformers.Conv1D):
            if len(inp.shape) == 3:
                inp = inp.reshape((-1, inp.shape[-1]))
                # 合并前两维变成 [batch*seq_len, embed]
            inp = inp.t() # [embed, B*S]
```
:::

:::pair
```python
        self.H *= self.nsamples / (self.nsamples + tmp)
        self.nsamples += tmp
        inp = math.sqrt(2 / self.nsamples) * inp.float()
        self.H += inp.matmul(inp.t())
```

这里是做了滑动累计: 对于多个<span style="text-decoration: underline wavy;">sample的数据</span>行平均处理得到
$$\begin{align}
H ≈ &\frac{2}{N}\sum_i X_i X_i^T \\
&=\frac{n} {N}  H_{old} + \frac{2}{N} XX^T
\end{align}
$$

这里假设 $H_{old} = \frac{2}{n} X_{old} X_{old}^T$ ,这样更新就相当于$\frac{2}{N}* (X_{old} X_{old}^T + X X^T)$

:::



:::pair 
```python
    def fasterprune(
        self, sparsity, prunen=0, prunem=0, blocksize=128, percdamp=.01
    ):
        W = self.layer.weight.data.clone()
        if isinstance(self.layer, nn.Conv2d):
            W = W.flatten(1)
        if isinstance(self.layer, transformers.Conv1D):
            W = W.t()
        W = W.float()

        if hasattr(self, 'quantizer'):
            if not self.quantizer.ready():
                self.quantizer.find_params(W, weight=True)

        tick = time.time()
```
:::

:::pair
```python
        H = self.H
        del self.H
        dead = torch.diag(H) == 0
        H[dead, dead] = 1
        W[:, dead] = 0
```
由于有些维度可能并没有被激活过, 所以可能导致对角线上的值是0, 或者说为了防止除零, 把这些
:::

:::pair
```python
        Losses = torch.zeros(self.rows, device=self.dev)

        damp = percdamp * torch.mean(torch.diag(H))
        diag = torch.arange(self.columns, device=self.dev)
        H[diag, diag] += damp  #在对角元加正则项
        H = torch.linalg.cholesky(H)
        H = torch.cholesky_inverse(H)
        H = torch.linalg.cholesky(H, upper=True)
        Hinv = H
```
:::
:::pair
```python

        mask = None
        # prunen 在组内要减掉多少个权重 和 prunem 每组有多少权重 
        for i1 in range(0, self.columns, blocksize):
            i2 = min(i1 + blocksize, self.columns)
            count = i2 - i1

            W1 = W[:, i1:i2].clone() 
            Q1 = torch.zeros_like(W1)
            Err1 = torch.zeros_like(W1)
            Losses1 = torch.zeros_like(W1)
            Hinv1 = Hinv[i1:i2, i1:i2] # [i,i+B]

            if prunen == 0: # 不做半结构化剪枝
                if mask is not None:
                    mask1 = mask[:, i1:i2]
                else:
                    tmp = W1 ** 2 / (torch.diag(Hinv1).reshape((1, -1))) ** 2 # 为了做按列广播除法, 转换为行向量
                    thresh = torch.sort(tmp.flatten())[0][int(tmp.numel() * sparsity)] 
                    mask1 = tmp <= thresh
            else:
                mask1 = torch.zeros_like(W1) == 1

            for i in range(count):
                w = W1[:, i]
                d = Hinv1[i, i] # H^{-1}_jj

                if prunen != 0 and i % prunem == 0:
                    tmp = W1[:, i:(i + prunem)] ** 2 / (torch.diag(Hinv1)[i:(i + prunem)].reshape((1, -1))) ** 2
                    mask1.scatter_(1, i + torch.topk(tmp, prunen, dim=1, largest=False)[1], True)

                q = w.clone()
                q[mask1[:, i]] = 0

                if hasattr(self, 'quantizer'):
                    q = quantize(
                        q.unsqueeze(1), self.quantizer.scale, self.quantizer.zero, self.quantizer.maxq
                    ).flatten()

                Q1[:, i] = q
                Losses1[:, i] = (w - q) ** 2 / d ** 2

                err1 = (w - q) / d # 相当于保留mask的丢掉非mask的
                W1[:, i:] -= err1.unsqueeze(1).matmul(Hinv1[i, i:].unsqueeze(0))
                Err1[:, i] = err1

            W[:, i1:i2] = Q1
            Losses += torch.sum(Losses1, 1) / 2

            W[:, i2:] -= Err1.matmul(Hinv[i1:i2, i2:])

            if DEBUG:
                self.layer.weight.data[:, :i2] = W[:, :i2]
                self.layer.weight.data[:, i2:] = W[:, i2:]
                print(torch.sum((self.layer(self.inp1) - self.out1) ** 2))
                print(torch.sum(Losses))
```
这里是整个文件的核心过程
:::
:::pair
```python
        torch.cuda.synchronize()
        print('time %.2f' % (time.time() - tick))
        print('error', torch.sum(Losses).item())

        if isinstance(self.layer, transformers.Conv1D):
            W = W.t()
        self.layer.weight.data = W.reshape(self.layer.weight.shape).to(self.layer.weight.data.dtype)
        if DEBUG:
            print(torch.sum((self.layer(self.inp1) - self.out1) ** 2))

```
这里使用`synchronize()`同步gpu上时间, 等gpu上的任务结束
:::

:::pair
``` python
    def free(self):
        if DEBUG:
            self.inp1 = None
            self.out1 = None
        self.H = None
        torch.cuda.empty_cache()
```
这里的操作是把gpu上的所有空闲内容回收
:::
