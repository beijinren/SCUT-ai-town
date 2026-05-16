# Conversation Guard 最小接入方案

## 目标

在不大改原 AI Town 对话链路的前提下，把 GM guard 插入到：

`generateMessage -> gmGuard -> writeMessage`

## 真实接入位置

虽然 prompt 组装发生在 `convex/agent/conversation.ts`，但“生成完文本、写入 messages 前”的最小桥接点实际位于：

- `convex/aiTown/agentOperations.ts`
  - `agentGenerateMessage()`
  - 这里先调用 `startConversationMessage / continueConversationMessage / leaveConversationMessage`
  - 然后把生成的 `text` 交给 `internal.aiTown.agent.agentSendMessage`

因此，最小 patch 不应该把 GM guard 硬塞进 `convex/agent/conversation.ts`。
更稳妥的做法是在 `agentGenerateMessage()` 中加入桥接。

## Patch 方案

### 1. 在哪里调用 `conversationGuardBridge`

建议位置：

1. `agentGenerateMessage()` 调完 `completionFn(...)` 拿到 `text`
2. 在调用 `internal.aiTown.agent.agentSendMessage` 之前
3. 先构造 `gmContext`
4. 调用 `guardGeneratedMessage({ agentId, conversationId, rawOutput, runtimeContext })`

这样做的好处：

- `convex/agent/conversation.ts` 仍然只负责 prompt 和文本生成
- `convex/aiTown/agentOperations.ts` 仍然是“异步 agent 行为编排层”
- GM 只作为旁路检查层出现

### 2. 如何处理 `shouldWrite=false`

如果 `guardGeneratedMessage()` 返回：

- `shouldWrite=false`

则：

1. 不调用 `agentSendMessage`
2. 不把当前文本写入 `messages`
3. 返回或进入 regenerate 分支

这能保证明显错误输出不会进入消息表。

### 3. 如何触发 `regenerate`

如果返回：

- `shouldRegenerate=true`
- 且 `regenerationPrompt` 存在

建议最小实现：

1. 先不做无限重试
2. 在 `agentGenerateMessage()` 内最多进行一次重生成
3. 重生成时复用原有 LLM 调用入口
4. 将 `regenerationPrompt` 作为附加约束，重新得到 `finalOutput`
5. 对重生成结果再走一次 guard

这样可以避免：

- 改动原 prompt builder 太多
- 在第一版就引入复杂重试状态机

### 4. 如何确保错误输出不进入 memories

当前 memory 写入是在会话结束后进行的，不是消息生成函数里立即写入。

要确保错误输出不进入 memories，关键是：

1. 错误输出不要进入 `messages`
2. 会话总结依赖 `messages` 时，自然就不会读到这条文本

也就是说，**最关键的控制点是拦截消息写入，而不是直接修改 memory 模块**。

## 推荐最小改动文件

- `convex/GM/bridge/conversationGuardBridge.ts`
  - 保持桥接逻辑
- `convex/GM/runtime/gmContextLoader.ts`
  - 提供最小可用只读上下文
- `convex/aiTown/agentOperations.ts`
  - 增加一次 guard 调用

## 当前不建议直接修改的文件

- `convex/agent/conversation.ts`
  - 保持其职责为 prompt 组装与生成
- `convex/aiTown/game.ts`
- `convex/aiTown/movement.ts`
- `convex/engine/abstractGame.ts`

## 第一版接入建议

第一版只做：

1. 生成后检查
2. 明确泄露时阻止写入
3. possible leakage 时单次 regenerate
4. 记录独立 GM debug

先不要做：

- 多轮 regenerate
- 自动回滚世界状态
- 直接修改 memory 写入器
- 把 GM 深度耦合进原 conversation prompt builder
