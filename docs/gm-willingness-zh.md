# GM Willingness 说明

本文档只讲一件事：

```text
在新的协作方案里，GM 如何尽可能少地参与 willingness。
```

---

## 1. 目标

现在的目标不是让 GM 自己完整算分，而是：

1. 每个 agent 先由你队友那边的逻辑给自己打 willingness 分。
2. GM 只在“对话意愿真的发生变化”时接入。
3. GM 负责把外部分数按稳定规则排序。
4. 只有非常少见的同分或冲突情况，才给 GM 预留一个可扩展接口。

因此，GM 在 willingness 上的定位从“主决策者”变成：

```text
轻量触发器 + 稳定排序器 + 稀有冲突扩展位
```

---

## 2. GM 什么时候介入

文件：

[willingnessTrigger.ts](</E:/SCUT-ai-town/convex/GM/willingness/willingnessTrigger.ts>)

GM 只在这些时机建议重算：

1. `first_round`
2. `new_participant_joined`
3. `direct_question`
4. `challenged_or_requested`
5. `agent_mentioned`
6. `new_information`
7. `scene_phase_changed`
8. `topic_changed`

如果没有这些变化，返回 `null`，表示：

```text
这一轮 GM 不介入 willingness。
```

---

## 3. 外部分数如何接入

文件：

[turnOrderResolver.ts](</E:/SCUT-ai-town/convex/GM/willingness/turnOrderResolver.ts>)

新增的主接口：

```ts
resolveTurnOrderFromExternalScores(scores, triggerReason)
```

你队友那边只需要提供：

```ts
[
  { agentId: 'alice', score: 68, reason: '...' },
  { agentId: 'bob', score: 92, reason: '...' },
  { agentId: 'charlie', score: 35, reason: '...' },
]
```

GM 会做的事情很少：

1. 把外部分数标准化。
2. 按分数从高到低排序。
3. 应用固定 tie-break。
4. 返回 `selectedNextSpeaker`。

---

## 4. 当前写死的排序规则

当前 resolver 只做简单稳定规则：

1. 分数高的优先。
2. 同分时，被 `direct_question` 标记的人优先。
3. 再同分时，按 `agentId` 做稳定排序。

这套规则的目的不是“最聪明”，而是：

```text
先足够稳定、可解释、低干预。
```

---

## 5. GM 冲突扩展接口

新增接口：

```ts
buildGMWillingnessExtensionRequest(...)
```

当出现以下情况时，它会返回一个扩展请求：

1. 最高分同分。
2. 后续需要你们自定义的 ranking conflict。

返回示例结构：

```ts
{
  conversationId: 'c1',
  triggerReason: 'direct_question',
  ranking: [...],
  conflict: {
    type: 'score_tie',
    agentIds: ['alice', 'bob'],
    reason: 'Multiple agents share the highest willingness score.',
  }
}
```

注意：

```text
现在只留接口，不真正让 GM 模型去改顺序。
```

这正符合“GM 尽可能少介入”的原则。

---

## 6. 为什么还保留内部 willingnessCalculator

文件：

[willingnessCalculator.ts](</E:/SCUT-ai-town/convex/GM/willingness/willingnessCalculator.ts>)

它现在仍然保留，但主要用于：

1. demo。
2. 测试。
3. 过渡期兼容。

不建议把它作为你们最终主链路。

更推荐的主链路是：

```text
外部 agent 自评分 -> GM trigger -> GM stable sort -> 可选扩展接口
```

---

## 7. 建议的接入流程

推荐流程如下：

```text
1. 一轮对话结束。
2. 调用 shouldRefreshTurnOrder(context)。
3. 如果返回 null：
   直接沿用当前顺序或你们自己的默认策略。
4. 如果返回 triggerReason：
   让每个 agent 返回 willingness score。
5. 调用 resolveTurnOrderFromExternalScores(context, externalScores)。
6. 取 selectedNextSpeaker 作为下一位发言者。
7. 如果 needsGMReview = true：
   可选地调用 buildWillingnessExtensionRequest() 交给未来扩展逻辑。
```

---

## 8. 与 GM 独立模型的关系

文件：

[gmModelConfig.ts](</E:/SCUT-ai-town/convex/GM/gmModelConfig.ts>)

GM 已经单独拆出模型配置：

```ts
GM_API_URL
GM_API_KEY
GM_MODEL
```

当前 willingness 冲突扩展接口还没有真正调用这个模型，但以后如果你们决定：

```text
同分时让 GM 单独判断一下谁更该说
```

那就可以直接在这条扩展位上挂 GM 自己的模型，而不影响 agent 主模型。

---

## 9. 现在已经实现了什么

已实现：

1. 触发判断接口。
2. 外部分数接入接口。
3. 固定稳定排序。
4. 同分冲突检测。
5. GM 扩展请求接口。
6. GM 独立模型配置文件。

暂不实现：

1. 真正的 GM tie-break 模型调用。
2. 复杂的冲突语义判断。
3. 覆盖你队友的主 willingness 算分逻辑。

---

## 10. 一句话结论

现在的 willingness 方案已经改成：

```text
主分数由 agent 侧给出，GM 只在关键变化时出面做触发和排序，并为极少见的同分冲突预留一个可扩展接口。
```
