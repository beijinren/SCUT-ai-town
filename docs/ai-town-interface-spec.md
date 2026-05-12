# AI Town 接口规范与变量管理

本文基于当前仓库实现整理，重点覆盖三类内容：

1. 项目结构与模块职责
2. 接口规范
3. 变量管理与 NPC 对话输出规范

适用范围：

- 前端 UI 与 Convex 后端之间的调用关系
- AI Town 游戏输入系统
- NPC 聊天时 `system` prompt 的拼装链路
- `convex/util/llm.ts` 与 `convex/agent/conversation.ts` 的职责边界

## 1. 项目结构

### 1.1 顶层目录

- `src/`
  - React + Pixi 前端
  - 负责渲染地图、角色、聊天、交互按钮
- `convex/`
  - 后端主目录
  - 包含世界模拟、输入处理、消息、代理、LLM 调用、数据库 schema
- `data/`
  - 初始角色与地图静态数据
- `public/assets/` 与 `assets/`
  - 图像、字体、音乐、spritesheet 等静态资源
- `src/editor/`
  - 地图编辑器
- `docs/`
  - 项目文档与规范

### 1.2 `convex/` 分层

#### `convex/aiTown/`

AI Town 的游戏规则层，负责：

- 玩家、会话、代理、世界状态的核心数据结构
- 输入定义与处理
- 移动、碰撞、对话状态推进
- 驱动引擎 step/tick

关键文件：

- `main.ts`
  - 引擎启动、kick、stop、`runStep`
- `game.ts`
  - 世界加载/保存、step 执行
- `inputs.ts`
  - 汇总所有可提交的游戏输入
- `player.ts`
  - 玩家模型、加入/离开/移动输入
- `conversation.ts`
  - 会话模型、邀请/接受/打字/离开输入
- `agentInputs.ts`
  - 代理异步操作回写输入
- `world.ts`
  - 世界状态序列化
- `worldMap.ts`
  - 地图数据结构
=
#### `convex/engine/`

通用模拟引擎层，负责：

- 引擎内部 schema
- step/tick 驱动
- 输入队列与处理结果回写
- 历史状态回放支持

#### `convex/agent/`

AI 代理层，负责：

- 记忆检索与反思
- NPC 对话 prompt 组装
- 调用 LLM 产出对话、行动、记忆摘要
- 通过输入系统把异步决策回写到游戏引擎

关键文件：

- `conversation.ts`
  - NPC 会话 prompt 构造与消息生成
- `memory.ts`
  - 记忆搜索、总结、重要性评分、反思
- `embeddingsCache.ts`
  - embedding 缓存

#### `convex/util/`

公共工具层，负责：

- LLM API 适配与重试：`llm.ts`
- 几何/路径/压缩/异步工具

### 1.3 `src/` 分层

- `components/`
  - 游戏画面、消息面板、玩家详情、按钮等
- `hooks/`
  - `useServerGame`
  - `useSendInput`
  - `useWorldHeartbeat`
  - 历史时间/历史值回放

关键链路：

- `src/components/Game.tsx`
  - 拉取默认世界、世界状态、地图描述
- `src/hooks/serverGame.ts`
  - 将后端序列化数据重建为 `World` / `WorldMap`
- `src/hooks/sendInput.ts`
  - 统一封装输入调用与结果等待

## 2. 接口规范

## 2.1 对外调用总览

前端主要通过 Convex `query` / `mutation` 调后端。

### 世界相关

- `api.world.defaultWorldStatus`
  - 返回默认世界状态
  - 用途：获取 `worldId`、`engineId`
- `api.world.worldState`
  - 输入：`{ worldId }`
  - 返回：`{ world, engine }`
- `api.world.gameDescriptions`
  - 输入：`{ worldId }`
  - 返回：`{ worldMap, playerDescriptions, agentDescriptions }`
- `api.world.userStatus`
  - 输入：`{ worldId }`
  - 返回：当前用户标识
- `api.world.previousConversation`
  - 输入：`{ worldId, playerId }`
  - 返回：上一段非空历史对话
- `api.world.heartbeatWorld`
  - 输入：`{ worldId }`
  - 用途：保活世界
- `api.world.joinWorld`
  - 输入：`{ worldId }`
  - 用途：让人类玩家加入世界
- `api.world.leaveWorld`
  - 输入：`{ worldId }`
  - 用途：让人类玩家离开世界
- `api.world.sendWorldInput`
  - 输入：`{ engineId, name, args }`
  - 用途：统一透传游戏输入

### 消息相关

- `api.messages.listMessages`
  - 输入：`{ worldId, conversationId }`
  - 返回：消息列表，附带 `authorName`
- `api.messages.writeMessage`
  - 输入：`{ worldId, conversationId, messageUuid, playerId, text }`
  - 用途：写入消息并提交 `finishSendingMessage`

### 引擎输入状态相关

- `api.aiTown.main.sendInput`
  - 输入：`{ worldId, name, args }`
  - 用途：向引擎提交标准输入
- `api.aiTown.main.inputStatus`
  - 输入：`{ inputId }`
  - 返回：输入处理状态/结果

说明：

- 前端通常不直接调 `api.aiTown.main.sendInput`
- 前端使用 `api.world.sendWorldInput`，再由 `src/hooks/sendInput.ts` 监听 `inputStatus`

## 2.2 通用输入接口规范

统一输入入口有两个形态：

### 形态 A：世界级透传

```ts
api.world.sendWorldInput({
  engineId,
  name,
  args,
});
```

特点：

- 给前端用
- 根据 `engineId` 路由到引擎输入队列
- 返回 `inputId`

### 形态 B：引擎级透传

```ts
api.aiTown.main.sendInput({
  worldId,
  name,
  args,
});
```

特点：

- 给后端 action/internal mutation 用
- 通常出现在 agent 异步操作回写中

### 输入处理结果规范

`src/hooks/sendInput.ts` 对输入结果有统一约定：

- `undefined`
  - query 还在加载
- `null`
  - 输入尚未处理完
- `{ kind: 'error', message }`
  - 输入失败
- `{ kind: 'success', value }`
  - 输入成功

前端调用方应只通过 `waitForInput` / `useSendInput` 等封装消费，不建议自己轮询。

## 2.3 游戏输入清单

所有输入由 `convex/aiTown/inputs.ts` 聚合：

- `playerInputs`
- `conversationInputs`
- `agentInputs`

### 玩家输入

#### `join`

参数：

```ts
{
  name: string;
  character: string;
  description: string;
  tokenIdentifier?: string;
}
```

返回：

- `null`

作用：

- 创建玩家实例
- 初始化位置、朝向、描述

#### `leave`

参数：

```ts
{
  playerId: Id<'players'>;
}
```

返回：

- `null`

#### `moveTo`

参数：

```ts
{
  playerId: Id<'players'>;
  destination: Point | null;
}
```

返回：

- `null`

说明：

- `destination !== null` 表示开始移动
- `destination === null` 表示停止移动

### 会话输入

#### `startConversation`

参数：

```ts
{
  playerId: Id<'players'>;
  invitee: Id<'players'>;
}
```

返回：

- `conversationId`

#### `startTyping`

参数：

```ts
{
  playerId: Id<'players'>;
  conversationId: Id<'conversations'>;
  messageUuid: string;
}
```

返回：

- `null`

#### `finishSendingMessage`

参数：

```ts
{
  playerId: Id<'players'>;
  conversationId: Id<'conversations'>;
  timestamp: number;
}
```

返回：

- `null`

作用：

- 清除 typing 状态
- 更新 `lastMessage`
- 增加 `numMessages`

#### `acceptInvite`

参数：

```ts
{
  playerId: Id<'players'>;
  conversationId: Id<'conversations'>;
}
```

返回：

- `null`

#### `rejectInvite`

参数：

```ts
{
  playerId: Id<'players'>;
  conversationId: Id<'conversations'>;
}
```

返回：

- `null`

#### `leaveConversation`

参数：

```ts
{
  playerId: Id<'players'>;
  conversationId: Id<'conversations'>;
}
```

返回：

- `null`

### 代理输入

#### `finishRememberConversation`

参数：

```ts
{
  operationId: string;
  agentId: Id<'agents'>;
}
```

返回：

- `null`

#### `finishDoSomething`

参数：

```ts
{
  operationId: string;
  agentId: Id<'agents'>;
  destination?: Point;
  invitee?: Id<'players'>;
  activity?: {
    description: string;
    emoji?: string;
    until: number;
  };
}
```

返回：

- `null`

#### `agentFinishSendingMessage`

参数：

```ts
{
  agentId: Id<'agents'>;
  conversationId: Id<'conversations'>;
  timestamp: number;
  operationId: string;
  leaveConversation: boolean;
}
```

返回：

- `null`

#### `createAgent`

参数：

```ts
{
  descriptionIndex: number;
}
```

返回：

```ts
{
  agentId: Id<'agents'>;
}
```

## 2.4 消息接口规范

### `listMessages`

输入：

```ts
{
  worldId: Id<'worlds'>;
  conversationId: Id<'conversations'>;
}
```

输出字段：

```ts
{
  _id: Id<'messages'>;
  _creationTime: number;
  conversationId: Id<'conversations'>;
  messageUuid: string;
  author: Id<'players'>;
  authorName: string;
  text: string;
  worldId?: Id<'worlds'>;
}
```

### `writeMessage`

输入：

```ts
{
  worldId: Id<'worlds'>;
  conversationId: Id<'conversations'>;
  messageUuid: string;
  playerId: Id<'players'>;
  text: string;
}
```

副作用：

1. 插入 `messages`
2. 自动补发 `finishSendingMessage`

## 3. 变量管理规范

当前项目中的“变量”应分三层管理。

## 3.1 第一层：环境变量

环境变量只放部署环境、第三方服务与模型选择，不放业务运行态。

### LLM 相关

- `LLM_PROVIDER`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `TOGETHER_API_KEY`
- `TOGETHER_CHAT_MODEL`
- `TOGETHER_EMBEDDING_MODEL`
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_EMBEDDING_MODEL`
- `OLLAMA_HOST`
- `OLLAMA_MODEL`
- `OLLAMA_EMBEDDING_MODEL`

### 音乐相关

- `REPLICATE_API_TOKEN`
- `CONVEX_SITE_URL`

### 测试/调试相关

- `STOP_NOT_ALLOWED`

### 当前实现中的“半配置项”

- `NUM_MEMORIES_TO_SEARCH`

说明：

- 该值在 `convex/agent/conversation.ts` 中通过 `process.env.NUM_MEMORIES_TO_SEARCH` 直接覆盖常量
- 建议统一收口到配置模块，避免常量和环境变量双源

## 3.2 第二层：代码常量

代码常量集中在 `convex/constants.ts`，适合放：

- 超时
- tick/step 周期
- 距离阈值
- cooldown
- 默认人数限制
- 默认活动列表

当前主要常量类型：

- 引擎时序
  - `ACTION_TIMEOUT`
  - `MAX_STEP`
  - `TICK`
  - `STEP_INTERVAL`
  - `ENGINE_ACTION_DURATION`
- 世界保活
  - `IDLE_WORLD_TIMEOUT`
  - `WORLD_HEARTBEAT_INTERVAL`
- 移动/碰撞
  - `PATHFINDING_TIMEOUT`
  - `PATHFINDING_BACKOFF`
  - `COLLISION_THRESHOLD`
  - `MAX_PATHFINDS_PER_STEP`
- 会话规则
  - `CONVERSATION_DISTANCE`
  - `TYPING_TIMEOUT`
  - `CONVERSATION_COOLDOWN`
  - `PLAYER_CONVERSATION_COOLDOWN`
  - `INVITE_TIMEOUT`
  - `MAX_CONVERSATION_DURATION`
  - `MAX_CONVERSATION_MESSAGES`
  - `MESSAGE_COOLDOWN`
- 代理规则
  - `NUM_MEMORIES_TO_SEARCH`
  - `AGENT_WAKEUP_THRESHOLD`
- 用户与默认值
  - `MAX_HUMAN_PLAYERS`
  - `DEFAULT_NAME`
- 活动模板
  - `ACTIVITIES`

建议：

- 所有“可通过调参影响玩法”的值继续集中在 `constants.ts`
- 只有“环境差异”或“密钥/服务地址”才进入 `process.env`

## 3.3 第三层：运行时状态

运行时状态不应塞进常量或环境变量，应进入数据库或游戏对象。

### 数据库存储

- `worlds`
- `worldStatus`
- `maps`
- `messages`
- `playerDescriptions`
- `agentDescriptions`
- `memories`
- `memoryEmbeddings`
- `archivedConversations`
- `archivedPlayers`
- `archivedAgents`

### 内存态对象

- `Game`
- `World`
- `Player`
- `Conversation`
- `Agent`
- `WorldMap`

规范建议：

- 环境变量：外部依赖
- 常量：玩法参数
- DB/内存态：世界运行状态

## 4. NPC 对话输出规范

本节描述 NPC 聊天时，`system` prompt 是如何拼装的，以及 LLM 输出应该满足什么规则。

## 4.1 职责边界

### `convex/agent/conversation.ts`

负责：

- 收集 prompt 所需上下文
- 组装 `system` prompt
- 组装历史消息
- 指定 stop words
- 调用 `chatCompletion`
- 清理模型输出前缀

### `convex/util/llm.ts`

负责：

- 选择 LLM provider
- 组装统一请求格式
- 发起 `/v1/chat/completions`
- 重试与回退
- 处理流式/非流式返回

结论：

- `conversation.ts` 定义“说什么”
- `llm.ts` 定义“怎么发给模型”

## 4.2 NPC 会话的三类输出

### 1. 开场消息

函数：

- `startConversationMessage(...)`

用途：

- NPC 刚开启对话时生成第一句话

### 2. 继续聊天

函数：

- `continueConversationMessage(...)`

用途：

- NPC 在已有上下文里接着说

### 3. 离开消息

函数：

- `leaveConversationMessage(...)`

用途：

- NPC 准备退出对话时生成告别语

## 4.3 `system` prompt 拼装规范

### 开场消息 `startConversationMessage`

系统 prompt 由以下片段顺序拼装：

1. 场景句

```txt
You are {player.name}, and you just started a conversation with {otherPlayer.name}.
```

2. 角色自我设定与目标

- `About you: {agent.identity}`
- `Your goals for the conversation: {agent.plan}`

3. 对方设定

- `About {otherPlayer.name}: {otherAgent.identity}`

4. 上次对话时间

- 如果存在历史会话，则补充上次聊天时间与当前时间

5. 相关记忆

- 如果记忆检索有结果，加入：
  - `Here are some related memories in decreasing relevance order:`
  - 每条记忆以 ` - {memory.description}` 追加

6. 若存在和对方的历史记忆，增加行为要求

```txt
Be sure to include some detail or question about a previous conversation in your greeting.
```

7. 最后一行强制输出提示

```txt
{player.name} to {otherPlayer.name}:
```

输出特征：

- 只发一句开场
- 更偏 greeting / 起话头
- 如果命中与对方的记忆，要提及上次聊过的内容

### 继续聊天 `continueConversationMessage`

系统 prompt 由以下片段组成：

1. 当前对话状态

```txt
You are {player.name}, and you're currently in a conversation with {otherPlayer.name}.
The conversation started at {started}. It's now {now}.
```

2. 角色设定与目标

3. 相关记忆

4. 聊天约束

```txt
Below is the current chat history between you and {otherPlayer.name}.
DO NOT greet them again. Do NOT use the word "Hey" too often. Your response should be brief and within 200 characters.
```

5. 历史消息列表

历史消息不是 system，而是作为 `user` 消息逐条塞进去，格式统一为：

```txt
{author.name} to {recipient.name}: {message.text}
```

6. 末尾再追加一个 user prompt：

```txt
{player.name} to {otherPlayer.name}:
```

输出特征：

- 不允许重新打招呼
- 应短句回复
- 目标长度为 200 字符内

### 离开消息 `leaveConversationMessage`

系统 prompt 由以下片段组成：

1. 当前对话状态
2. 离开意图说明

```txt
You've decided to leave the question and would like to politely tell them you're leaving the conversation.
```

3. 角色设定与目标
4. 历史消息与约束

```txt
Below is the current chat history between you and {otherPlayer.name}.
How would you like to tell them that you're leaving? Your response should be brief and within 200 characters.
```

5. 历史消息列表
6. 末尾 user prompt：

```txt
{player.name} to {otherPlayer.name}:
```

输出特征：

- 语气礼貌
- 明确表达离开
- 保持简短

## 4.4 Stop Words 规范

`conversation.ts` 中为消息生成设置 stop words：

```txt
{otherPlayer} to {player}:
{otherplayer} to {player}:
```

用途：

- 防止模型把下一轮对方的话也一起续写出来

注意：

- 注释中已说明 OpenAI stop 最多支持 4 个
- 当前实现只用了两种大小写变体

## 4.5 输出裁剪规范

模型有时会把提示前缀一起输出，例如：

```txt
Alice to Bob: Nice to see you again.
```

因此 `trimContentPrefx` 会裁掉前缀：

```txt
{player.name} to {otherPlayer.name}:
```

最终保留真正消息正文。

## 4.6 `llm.ts` 请求规范

`chatCompletion` 的输入结构是统一的：

```ts
{
  model?: string;
  messages: LLMMessage[];
  temperature?: number | null;
  max_tokens?: number | null;
  stop?: string | string[];
  stream?: boolean;
}
```

### `LLMMessage` 结构

```ts
{
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}
```

### provider 选择顺序

1. OpenAI
2. Together.ai
3. 自定义 OpenAI-compatible API
4. 默认 Ollama

### 返回值规范

非流式：

```ts
{
  content: string;
  retries: number;
  ms: number;
}
```

流式：

```ts
{
  content: ChatCompletionContent;
  retries: number;
  ms: number;
}
```

### 重试规范

- 对 `429` 与 `>=500` 自动重试
- 使用退避数组：
  - `1000ms`
  - `10000ms`
  - `20000ms`

## 5. 当前实现的注意点

### 5.1 `conversation.ts` 里混合了 prompt 规范与业务查询

当前一个文件同时负责：

- 查询世界/玩家/历史消息/历史对话
- 记忆检索
- system prompt 拼装
- 模型调用

建议后续拆成：

- `promptData.ts`
- `promptBuilder.ts`
- `conversation.ts`

### 5.2 `NUM_MEMORIES_TO_SEARCH` 有双来源

当前来源有两个：

- `convex/constants.ts`
- `process.env.NUM_MEMORIES_TO_SEARCH`

建议保留单一真源。

### 5.3 `llm.ts` 里有完整日志输出

当前 `chatCompletion` 会：

- `console.log(body)`
- `console.log(content)`

风险：

- 可能打印完整 system prompt
- 可能泄露调试环境中的敏感文本
- 日志量大

建议：

- 默认只打摘要日志
- 通过显式 DEBUG 开关决定是否输出 full prompt

### 5.4 输出长度约束主要靠 prompt，不是硬约束

例如“200 characters 内”目前只是自然语言约束，不是程序截断。

建议：

- 如需稳定控制长度，在落库前增加长度检查或裁剪策略

## 6. 建议的后续规范方向

### 6.1 接口层

- 前端只调 `api.world.*` 与 `api.messages.*`
- `api.aiTown.main.*` 视为引擎内部接口
- 代理回写优先走内部 mutation/action，不直接暴露前端

### 6.2 配置层

- `process.env` 只管理外部服务与部署差异
- `constants.ts` 只管理玩法参数
- prompt 模板参数单独收口

### 6.3 prompt 层

- system prompt 模板化
- 记忆注入策略配置化
- 输出规范显式化
  - greeting
  - continue
  - leave
  - summary
  - importance score

---

如果后续需要继续整理，可以在本文基础上再拆两份：

1. `ai-town-prompt-spec.md`
2. `ai-town-runtime-config-spec.md`
