---
title: "part1: Mixtral7x8B generate"
slug: Mixtral7x8B_generate
date: 2026-03-24
type: code
tags:
  - model/mixtral
summary: 学习Mixtral7x8B的模型架构文件, part1, 这一部分主要从高度封装的角度, 梳理Mixtral是怎么generate的
---
:::pair
```python
  model.generate(...)
  → prepare_inputs_for_generation(...)
  → MixtralForCausalLM.forward(...)
  → MixtralModel.forward(...)
  → 每层 MixtralDecoderLayer.forward(...)
  → self_attn + block_sparse_moe
  → 最后 lm_head
  → 返回 logits 和 past_key_values
  → 外层生成循环再选下一个 token，继续下一轮
```
:::

:::pair
```python
   def prepare_inputs_for_generation(
        self,
        input_ids, #NOTE:tokenizer的输出之一,[batch_size, seq_len]
        past_key_values=None, #NOTE:这是从上一次forward的输出里来,输出会包含这个, 这就是KV cache 
                                # 维度通常是 [batch_size, num_heads, past_seq_len, head_dim] 
        attention_mask=None, # 从tokenizer中来, 用于标志哪些位置是pad的而哪些位置没有pad
        inputs_embeds=None, # 用户使用自定义的embedding
        output_router_logits=False, # MoE专家路由开关
        **kwargs,
    ):
```
- **注: 这个函数是属于MixtralForCausalLM这个类的!**
- tokenizer的输出之一,`[batch_size, seq_len]`
- past_key_values, 这是从上一次forward的输出里来,输出会包含这个, 这就是KV cache  `[batch_size, num_heads, past_seq_len, head_dim]`
:::

:::pair
```python
        # Omit tokens covered by past_key_values
        if past_key_values is not None: 
            if isinstance(past_key_values, Cache):
                cache_length = past_key_values.get_seq_length()
                past_length = past_key_values.seen_tokens
                max_cache_length = past_key_values.get_max_length()
            else:
                cache_length = past_length = past_key_values[0][0].shape[2]
                max_cache_length = None
```
- 如果是预填充阶段, 也就是先把用户的输入放进去跑一遍的阶段, 是不会有past_key_values的
- 在decode阶段就会有预填充阶段保存下来的kvcache.
:::
                
:::pair
```python

            if attention_mask is not None and attention_mask.shape[1] > input_ids.shape[1]:
                input_ids = input_ids[:, -(attention_mask.shape[1] - past_length) :]
            elif past_length < input_ids.shape[1]: 
                input_ids = input_ids[:, past_length:]
            # 3 - Otherwise (past_length >= input_ids.shape[1]), let's assume input_ids only has unprocessed tokens.

            # If we are about to go beyond the maximum cache length, we need to crop the input attention mask. 
            if (
                max_cache_length is not None
                and attention_mask is not None
                and cache_length + input_ids.shape[1] > max_cache_length
            ):
                attention_mask = attention_mask[:, -max_cache_length:]

```
- <span style="text-decoration: underline wavy;">只保留没有处理的tokens</span>
	1. 一部分历史输入已经存在于 cache 中，而不在当前 `input_ids` 中。
		- 使用 `past_key_values` / KV cache
		- 或者有些输入不是通过 `input_ids` 传，而是通过 `inputs_embeds` 传
		- 当前 `input_ids` 只是总序列的尾巴一小段
	2. 由于有些token已经被kv cache算过了, 就把他们去掉
	3. 默认只包含还没有处理的token, 这里的分支没有写出来
- 第二段: 如果cache已经超出限制了, 把cache里最久远的部分删掉.
:::
:::pair
```python
        position_ids = kwargs.get("position_ids", None) #NOTE:
        if attention_mask is not None and position_ids is None:
            # create position_ids on the fly for batch generation
            position_ids = attention_mask.long().cumsum(-1) - 1 # cumulate sum 
            position_ids.masked_fill_(attention_mask == 0, 1) 
            if past_key_values:
                position_ids = position_ids[:, -input_ids.shape[1] :] # 裁剪cache的部分
```
- 这一轮送进模型的每个 token，在序列里的位置编号, 这个会用于计算旋转位置编码或者是ROPE, `[batch_size, sequence_length]`
:::

:::pair
```python
        # if `inputs_embeds` are passed, we only want to use them in the 1st generation step
        if inputs_embeds is not None and past_key_values is None:
            model_inputs = {"inputs_embeds": inputs_embeds}
        else:
            model_inputs = {"input_ids": input_ids}

        model_inputs.update(
            {
                "position_ids": position_ids,
                "past_key_values": past_key_values,
                "use_cache": kwargs.get("use_cache"),
                "attention_mask": attention_mask,
                "output_router_logits": output_router_logits,
            }
        )
        return model_inputs

```

输出整理好的数据 --> 然后就可以开始进入forward啦
:::

:::pair
```python
class MixtralForCausalLM(MixtralPreTrainedModel):
    _tied_weights_keys = ["lm_head.weight"]

    def __init__(self, config): 
        super().__init__(config)
        self.model = MixtralModel(config)
        self.vocab_size = config.vocab_size
        self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)
        self.router_aux_loss_coef = config.router_aux_loss_coef
        # self.num_experts = config.num_local_experts
        self.num_experts_per_tok = config.num_experts_per_tok
        # Initialize weights and apply final processing
        self.post_init()

```
这个类本质上就是一个骨干加上一个分类头.
:::
:::pair
```python
    def get_input_embeddings(self):
        return self.model.embed_tokens

    def set_input_embeddings(self, value):
        self.model.embed_tokens = value

    def get_output_embeddings(self):
        return self.lm_head

    def set_output_embeddings(self, new_embeddings):
        self.lm_head = new_embeddings

    def set_decoder(self, decoder):
        self.model = decoder

    def get_decoder(self):
        return self.model
```
:::

:::pair
```python
    @add_start_docstrings_to_model_forward(MIXTRAL_INPUTS_DOCSTRING)
    @replace_return_docstrings(output_type=MoeCausalLMOutputWithPast, config_class=_CONFIG_FOR_DOC)
    # Ignore copy
    def forward(
        self,
        input_ids: torch.LongTensor = None,
        attention_mask: Optional[torch.Tensor] = None,
        position_ids: Optional[torch.LongTensor] = None,
        past_key_values: Optional[List[torch.FloatTensor]] = None,
        inputs_embeds: Optional[torch.FloatTensor] = None,
        labels: Optional[torch.LongTensor] = None,
        use_cache: Optional[bool] = None,
        output_attentions: Optional[bool] = None,
        output_hidden_states: Optional[bool] = None,
        output_router_logits: Optional[bool] = None,
        return_dict: Optional[bool] = None,
    ) -> Union[Tuple, MoeCausalLMOutputWithPast]:
        r"""
        Args:
            labels (`torch.LongTensor` of shape `(batch_size, sequence_length)`, *optional*):
                Labels for computing the masked language modeling loss. Indices should either be in `[0, ...,
                config.vocab_size]` or -100 (see `input_ids` docstring). Tokens with indices set to `-100` are ignored
                (masked), the loss is only computed for the tokens with labels in `[0, ..., config.vocab_size]`.

        Returns:

        Example:

        ```python
        >>> from transformers import AutoTokenizer, MixtralForCausalLM

        >>> model = MixtralForCausalLM.from_pretrained("mistralai/Mixtral-8x7B-v0.1")
        >>> tokenizer = AutoTokenizer.from_pretrained("mistralai/Mixtral-8x7B-v0.1")

        >>> prompt = "Hey, are you conscious? Can you talk to me?"
        >>> inputs = tokenizer(prompt, return_tensors="pt")

        >>> # Generate
        >>> generate_ids = model.generate(inputs.input_ids, max_length=30)
        >>> tokenizer.batch_decode(generate_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
        "Hey, are you conscious? Can you talk to me?
I'm not conscious, but I can talk to you."
        ```"""
```
:::

:::pair
```python
        output_attentions = output_attentions if output_attentions is not None else self.config.output_attentions
        output_router_logits = (
            output_router_logits if output_router_logits is not None else self.config.output_router_logits
        )

        output_hidden_states = (
            output_hidden_states if output_hidden_states is not None else self.config.output_hidden_states
        )
        return_dict = return_dict if return_dict is not None else self.config.use_return_dict
```
:::

:::pair
```python
        # decoder outputs consists of (dec_features, layer_state, dec_hidden, dec_attn)
        outputs = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            position_ids=position_ids,
            past_key_values=past_key_values,
            inputs_embeds=inputs_embeds,
            use_cache=use_cache,
            output_attentions=output_attentions,
            output_hidden_states=output_hidden_states,
            output_router_logits=output_router_logits,
            return_dict=return_dict,
        )

        hidden_states = outputs[0]
        logits = self.lm_head(hidden_states)
        logits = logits.float()
```
这里会经过backbond然后经过分类头
:::

:::pair
```python
        loss = None
        if labels is not None: #NOTE: 偏移+交叉熵计算
            # Shift so that tokens < n predict n
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            # Flatten the tokens
            loss_fct = CrossEntropyLoss()
            shift_logits = shift_logits.view(-1, self.config.vocab_size)
            shift_labels = shift_labels.view(-1)
            # Enable model parallelism
            shift_labels = shift_labels.to(shift_logits.device)
            loss = loss_fct(shift_logits, shift_labels)
```
偏移label, 计算交叉熵损失
:::

:::pair
```python
        aux_loss = None
        if output_router_logits:
            all_losses = outputs.router_logits if return_dict else outputs[-1]
            aux_loss = sum([out.to(logits.device) for out in all_losses]) # NOTE: 这里计算辅助损失
            if labels is not None:
                loss += self.router_aux_loss_coef * aux_loss  # make sure to reside in the same device 辅助损失乘以系数
```
计算辅助损失, 
:::
:::pair
```python
        if not return_dict:
            output = (logits,) + outputs[1:]
            if output_router_logits:
                output = (aux_loss,) + output
            return (loss,) + output if loss is not None else output



        return MoeCausalLMOutputWithPast(
            loss=loss,
            aux_loss=aux_loss,
            logits=logits,
            past_key_values=outputs.past_key_values,
            hidden_states=outputs.hidden_states,
            attentions=outputs.attentions,
            router_logits=outputs.router_logits,
        )
```
这里输出的结果为`[loss, aux_loss, logits, next_cache, all_hidden_states, all_self_attns, all_router_logits],
- <span style="text-decoration: underline wavy;">推理时</span>
	- 通常是：
		- labels=None, use_cache=True
		- 可能来自 generate()
			- 这时主要返回：
				- logits
				- past_key_values
		- 目的是继续生成下一个 token。
- <span style="text-decoration: underline wavy;">训练时</span>
	- 通常是：
		- labels 不为空
		- 可能还会开 output_router_logits=True
	- 这时主要返回：
		- loss
		- aux_loss
		- logits 
	- 目的是反向传播训练参数。

:::

 



:::pair
```python
class MixtralModel(MixtralPreTrainedModel):
    """
    Transformer decoder consisting of *config.num_hidden_layers* layers. Each layer is a [`MixtralDecoderLayer`]

    Args:
        config: MixtralConfig
    """

    def __init__(self, config: MixtralConfig):
        super().__init__(config)
        self.padding_idx = config.pad_token_id
        self.vocab_size = config.vocab_size

        self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size, self.padding_idx)
        self.layers = nn.ModuleList(
            [MixtralDecoderLayer(config, layer_idx) for layer_idx in range(config.num_hidden_layers)]
        )
        self._attn_implementation = config._attn_implementation
        self.norm = MixtralRMSNorm(config.hidden_size, eps=config.rms_norm_eps)

        self.gradient_checkpointing = False
        # Initialize weights and apply final processing
        self.post_init()
```
这个类是整个模型的骨干部分, 后续的其他CausualLM, 实际上是在这个骨干上添加里分类头`lm_head`
:::
:::pair
```python

    def get_input_embeddings(self):
        return self.embed_tokens

    def set_input_embeddings(self, value):
        self.embed_tokens = value
```
:::
:::pair
```python

    # Ignore copy
    @add_start_docstrings_to_model_forward(MIXTRAL_INPUTS_DOCSTRING)
    def forward(
        self,
        input_ids: torch.LongTensor = None,
        attention_mask: Optional[torch.Tensor] = None,
        position_ids: Optional[torch.LongTensor] = None,
        past_key_values: Optional[List[torch.FloatTensor]] = None, #是否包含了KVcache
        inputs_embeds: Optional[torch.FloatTensor] = None, 
        use_cache: Optional[bool] = None, #NOTE:是否使用KVcache
        output_attentions: Optional[bool] = None,
        output_hidden_states: Optional[bool] = None,
        output_router_logits: Optional[bool] = None,
        return_dict: Optional[bool] = None,
    ) -> Union[Tuple, MoeModelOutputWithPast]:
```
- 这里输入的input_ids是来自tokenizer编码的, 他的shape是\[B,query_len\], 
- 同样的attention_mask也是同样的维度, 代表的是是否是有效token
- position_ids: 可以由外部传递, 代表的是每个token在输入序列中的位置,<span style="text-decoration: underline wavy;"> 因为可能有kv cache</span>, 所以这里是需要计算的, 后续会用于位置编码.
:::

:::pair
```python
        output_attentions = output_attentions if output_attentions is not None else self.config.output_attentions
        output_router_logits = (
            output_router_logits if output_router_logits is not None else self.config.output_router_logits
        )
        output_hidden_states = (
            output_hidden_states if output_hidden_states is not None else self.config.output_hidden_states
        )
        use_cache = use_cache if use_cache is not None else self.config.use_cache

        return_dict = return_dict if return_dict is not None else self.config.use_return_dict

        # retrieve input_ids and inputs_embeds
        if input_ids is not None and inputs_embeds is not None:
            raise ValueError("You cannot specify both decoder_input_ids and decoder_inputs_embeds at the same time")
        elif input_ids is not None:
            batch_size, seq_length = input_ids.shape
        elif inputs_embeds is not None:
            batch_size, seq_length, _ = inputs_embeds.shape
        else:
            raise ValueError("You have to specify either decoder_input_ids or decoder_inputs_embeds")

```
:::
:::pair
```python
        past_key_values_length = 0

        if self.gradient_checkpointing and self.training: #如果开了gradient_checkpointing 就不能再开cache.
            if use_cache:
                logger.warning_once(
                    "`use_cache=True` is incompatible with gradient checkpointing. Setting `use_cache=False`..."
                )
                use_cache = False
```
这里梯度检查并且训练的时候, 不能和kv cache一起开, 因为梯度检查点打开的时候只会保存一部分的激活, 这会与kv cache的思路相反.
:::

:::pair
```python
        if use_cache:
            use_legacy_cache = not isinstance(past_key_values, Cache)
            if use_legacy_cache:
                past_key_values = DynamicCache.from_legacy_cache(past_key_values)
            past_key_values_length = past_key_values.get_usable_length(seq_length)
```
:::

:::pair
```python
        if position_ids is None: #如果外部没有显示传
            device = input_ids.device if input_ids is not None else inputs_embeds.device
            position_ids = torch.arange(
                past_key_values_length, seq_length + past_key_values_length, dtype=torch.long, device=device
            ) 
            position_ids = position_ids.unsqueeze(0).view(-1, seq_length)
        else:
            position_ids = position_ids.view(-1, seq_length).long() 
```
- 如果外部没有显示传递位置编码, 这里就要自己做, 由于前面的token被kv cache传递过了, 所以这里的position_ids就从后面开始.
	- 需要注意的是如果是自己生成的shape是`(1, seq_length)`, 因为这里会默认一个batch的同个位置的token位置编码是一致的
:::

:::pair
```python
        if inputs_embeds is None:
            inputs_embeds = self.embed_tokens(input_ids)

        if attention_mask is not None and self._attn_implementation == "flash_attention_2" and use_cache:
            is_padding_right = attention_mask[:, -1].sum().item() != batch_size
            if is_padding_right:
                raise ValueError(
                    "You are attempting to perform batched generation with padding_side='right'"
                    " this may lead to unexpected behaviour for Flash Attention version of Mixtral. Make sure to "
                    " call `tokenizer.padding_side  = 'left'` before tokenizing the input. "
                )
```
:::

:::pair
```python
        if self._attn_implementation == "flash_attention_2":
            # 2d mask is passed through the layers
            attention_mask = attention_mask if (attention_mask is not None and 0 in attention_mask) else None
        elif self._attn_implementation == "sdpa" and not output_attentions:
            # output_attentions=True can not be supported when using SDPA, and we fall back on
            # the manual implementation that requires a 4D causal mask in all cases.
            attention_mask = _prepare_4d_causal_attention_mask_for_sdpa(
                attention_mask,
                (batch_size, seq_length),
                inputs_embeds,
                past_key_values_length,
                sliding_window=self.config.sliding_window,
            )
        else:
            # 4d mask is passed through the layers
            attention_mask = _prepare_4d_causal_attention_mask(
                attention_mask,
                (batch_size, seq_length),
                inputs_embeds,
                past_key_values_length,
                sliding_window=self.config.sliding_window,
                ) #NOTE:(batch_size, 1, query_length, key_value_length)
```
这一块是把`attention_mask`转换为一个4D的张量, 这里面的步骤包括把padding和上三角矩阵结合, 生成真正的attention的mask, shape是`(batch_size, 1, query_length, key_value_length)`
:::
:::pair
```python

        hidden_states = inputs_embeds

        # decoder layers
        all_hidden_states = () if output_hidden_states else None
        all_self_attns = () if output_attentions else None
        all_router_logits = () if output_router_logits else None
        next_decoder_cache = None

        for decoder_layer in self.layers:
            if output_hidden_states:
                all_hidden_states += (hidden_states,)

            if self.gradient_checkpointing and self.training:
                layer_outputs = self._gradient_checkpointing_func(
                    decoder_layer.__call__,
                    hidden_states,
                    attention_mask,
                    position_ids,
                    past_key_values,
                    output_attentions,
                    output_router_logits,
                    use_cache,
                )
            else:
                layer_outputs = decoder_layer(
                    hidden_states,
                    attention_mask=attention_mask,
                    position_ids=position_ids,
                    past_key_value=past_key_values,
                    output_attentions=output_attentions,
                    output_router_logits=output_router_logits,
                    use_cache=use_cache,
                )

            hidden_states = layer_outputs[0]

            if use_cache:
                next_decoder_cache = layer_outputs[2 if output_attentions else 1]

            if output_attentions:
                all_self_attns += (layer_outputs[1],)

            if output_router_logits:
                all_router_logits += (layer_outputs[-1],)

        hidden_states = self.norm(hidden_states)

```
这里是封装好的经过一个`decoder_layer`
:::
:::pair
```python
        # add hidden states from the last decoder layer
        if output_hidden_states:
            all_hidden_states += (hidden_states,)

        next_cache = None
        if use_cache:
            next_cache = next_decoder_cache.to_legacy_cache() if use_legacy_cache else next_decoder_cache

        if not return_dict:
            return tuple(
                v
                for v in [hidden_states, next_cache, all_hidden_states, all_self_attns, all_router_logits]
                if v is not None
                ) 

        return MoeModelOutputWithPast(
            last_hidden_state=hidden_states,
            past_key_values=next_cache,
            hidden_states=all_hidden_states,
            attentions=all_self_attns,
            router_logits=all_router_logits,
        )


```
从这里我们可以看出整个模型forward之后得到的输出顺序为`[hidden_states, next_cache, all_hidden_states, all_self_attns, all_router_logits]`
:::
