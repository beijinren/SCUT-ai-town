# GM 接口说明

本文档描述当前 `convex/GM` 对外暴露的核心接口，重点说明：

1. GM 负责什么。
2. 外部系统应该怎样调用 GM。
3. GM 在 willingness 上如何尽可能少介入。
4. GM 如何使用独立模型配置。

---

## 1. 设计原则

GM 是旁路监督层，不是第二套游戏引擎。

因此接口设计遵循三条规则：

1. 先读取原 AI Town 状态，再做解释。
2. 能返回“建议”或“判断”就不直接改原状态。
3. 在 willingness 上只做触发判断、稳定排序和稀有冲突扩展接口，不接管主打分逻辑。

---

## 2. 总入口

文件：

[gmRuntime.ts](</E:/SCUT-ai-town/convex/GM/runtime/gmRuntime.ts>)

核心类：

```ts
class GMRuntime
```

它对外提供的主要接口如下。

### 2.1 观察类接口

```ts
buildAgentObservation(agentId: string)
buildConversationObservations(participantAgentIds: string[])
```

用途：

1. 给单个 agent 生成专属 observation。
2. 给一场对话中的多个 agent 分别生成 observation。

### 2.2 输出审查接口

```ts
checkAgentMessage(agentId: string, output: string, conversationId?: string)
```

返回内容包括：

```ts
result
intervention
rollback
regenerationPrompt
debugRecord
```

用途：

1. 检查一条生成文本是否泄露信息。
2. 给上层返回是否需要重生成。
3. 给上层返回是否应拒绝写入 messages。

### 2.3 工具动作接口

```ts
checkActionIntent(actionIntent: string)
```

用途：

1. 让 GM 判断一个动作属于真实工具、模拟工具还是仅记录叙事动作。
2. 返回统一 tool outcome。

### 2.4 Willingness 触发接口

```ts
shouldRefreshTurnOrder(context: GMWillingnessContext)
```

这是新的轻量接口。

作用：

```text
只判断当前轮次是否值得重算发言顺序。
```

如果没有关键变化，返回 `null`，表示这一轮 GM 不介入 willingness。

### 2.5 Willingness 外部分数接入接口

```ts
resolveTurnOrderFromExternalScores(
  context: GMWillingnessContext,
  externalScores: GMExternalWillingnessScore[],
)
```

作用：

1. 接收外部 willingness 分数。
2. 只有在 `shouldRefreshTurnOrder()` 命中触发条件时才工作。
3. 用写死的稳定规则进行排序。
4. 如果检测到同分等少见冲突，返回可供后续 GM 扩展的标志。

这正是推荐给你队友那套自评分逻辑的主接口。

### 2.6 Willingness 冲突扩展接口

```ts
buildWillingnessExtensionRequest(
  context: GMWillingnessContext,
  externalScores: GMExternalWillingnessScore[],
)
```

作用：

```text
只生成一个“可交给 GM 进一步判断”的请求体。
当前不真正执行 GM tie-break 模型。
```

也就是说，这里只留钩子，不把复杂规则提前实现死。

### 2.7 兼容性保留接口

```ts
resolveTurnOrder(context: GMWillingnessContext)
```

这个接口仍然保留，用于：

1. demo。
2. 现有测试。
3. 过渡期兼容。

但生产主路径建议使用外部分数接口，而不是继续让 GM 自己完整打分。

---

## 3. Willingness 相关类型接口

文件：

[gmTypes.ts](</E:/SCUT-ai-town/convex/GM/gmTypes.ts>)

### 3.1 外部分数输入

```ts
interface GMExternalWillingnessScore {
  agentId: string;
  score: number;
  reason?: string;
  factors?: GMWillingnessFactor[];
  canSpeak?: boolean;
  source?: 'agent_self_score' | 'gm_internal_estimate' | 'manual';
}
```

用途：

1. 由你队友的每个 agent 自评分逻辑产出。
2. GM 不关心分数怎么来的，只消费结果。

### 3.2 排序结果

```ts
interface GMTurnOrderResult {
  ranking: GMWillingnessScore[];
  selectedNextSpeaker?: string;
  triggerReason: GMWillingnessTriggerReason;
  usedExternalScores?: boolean;
  needsGMReview?: boolean;
  conflict?: GMWillingnessConflict;
}
```

用途：

1. 返回排序后的发言顺序。
2. 标记本轮是否使用了外部分数。
3. 标记是否需要后续 GM 微调。

### 3.3 冲突描述

```ts
interface GMWillingnessConflict {
  type: 'score_tie' | 'ranking_conflict';
  agentIds: string[];
  reason: string;
}
```

用途：

1. 明确告诉上层冲突是什么。
2. 为后续 GM tie-break 模型预留输入。

### 3.4 GM 扩展请求

```ts
interface GMWillingnessExtensionRequest {
  conversationId: string;
  triggerReason: GMWillingnessTriggerReason;
  ranking: GMWillingnessScore[];
  conflict: GMWillingnessConflict;
}
```

用途：

```text
把“同分/冲突时需要 GM 进一步判断”的上下文单独封装出来。
```

---

## 4. GM 独立模型配置接口

文件：

[gmModelConfig.ts](</E:/SCUT-ai-town/convex/GM/gmModelConfig.ts>)

内容：

```ts
export const gmModelConfig = {
  provider: 'custom',
  defaultModel: 'deepseek-v4-flash',
  apiUrlEnv: 'GM_API_URL',
  apiKeyEnv: 'GM_API_KEY',
  modelEnv: 'GM_MODEL',
};
```

目的：

1. GM 不和 agent 共用模型配置。
2. 后续如果要让 GM 用更稳、更贵或更慢的模型，只改这里和对应调用链。
3. agent 主模型与 GM 模型可完全独立演进。

当前状态：

```text
配置文件已拆出。
GM tie-break 模型调用接口只留了扩展位，未真正接线。
```

---

## 5. 推荐调用方式

### 5.1 对话轮次结束后

推荐流程：

```text
1. 当前轮对话结束。
2. 调用 GMRuntime.shouldRefreshTurnOrder(context)。
3. 如果返回 null：
   本轮不需要 willingness 重算，GM 不介入。
4. 如果返回 triggerReason：
   让每个 agent 自己返回 willingness score。
5. 把外部分数传给 resolveTurnOrderFromExternalScores()。
6. 用返回的 ranking 作为下一轮发言顺序。
7. 如果 needsGMReview = true：
   可选地把 buildWillingnessExtensionRequest() 的结果交给未来 GM 扩展模型。
```

### 5.2 这样设计的好处

1. 主体排序逻辑归你队友那套 agent 自评分。
2. GM 只在关键变化时出现，不会每轮都插手。
3. 同分或冲突时有扩展位，但不强行复杂化当前实现。
4. 和原 AI Town 解耦更彻底。

---

## 6. 相关文件

核心文件：

```text
convex/GM/runtime/gmRuntime.ts
convex/GM/gmTypes.ts
convex/GM/gmModelConfig.ts
convex/GM/willingness/willingnessTrigger.ts
convex/GM/willingness/turnOrderResolver.ts
convex/GM/willingness/willingnessCalculator.ts
```

说明：

1. `willingnessTrigger.ts`：只判断是否值得刷新。
2. `turnOrderResolver.ts`：消费外部分数并稳定排序。
3. `willingnessCalculator.ts`：内部兜底算法，保留兼容，不建议作为最终主路径。
