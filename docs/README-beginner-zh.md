# AI Town 新手阅读手册

这份文档是写给第一次接触 AI Town 的同学看的。

目标不是把每个文件都解释一遍，而是帮你尽快回答下面这些最常见的问题：

1. 这个项目到底是做什么的？
2. 前端、后端、AI、地图分别放在哪里？
3. 页面上的一次点击，最后是怎么变成 NPC 行为的？
4. NPC 说话时，`system prompt` 是在哪里拼出来的？
5. 哪些值属于“配置”，哪些值属于“运行中的世界状态”？
6. 如果我要改人设、改地图、改对话风格，应该先看哪里？

如果你只想先抓住主线，建议按这个顺序阅读：

1. 本文档
2. `docs/ai-town-interface-spec.md`
3. `src/components/Game.tsx`
4. `src/hooks/sendInput.ts`
5. `convex/world.ts`
6. `convex/aiTown/main.ts`
7. `convex/aiTown/inputs.ts`
8. `convex/agent/conversation.ts`
9. `convex/util/llm.ts`

## 1. 先用一句话理解项目

AI Town 是一个“AI 角色生活在地图里并会自己聊天、移动、社交”的模拟世界。

你可以把它想成 4 层：

- 展示层：浏览器里看到的地图、人物、消息面板
- 世界层：玩家、NPC、会话、移动这些规则
- AI 层：NPC 如何记忆、如何决定说什么
- 模型层：真正调用 OpenAI / Ollama / Together 这些 LLM

## 2. 整体架构图

```text
Browser UI
  -> src/components/*
  -> src/hooks/*

Convex API
  -> convex/world.ts
  -> convex/messages.ts
  -> convex/aiTown/main.ts

Game Engine
  -> convex/aiTown/game.ts
  -> convex/aiTown/player.ts
  -> convex/aiTown/conversation.ts
  -> convex/aiTown/agentInputs.ts

Agent Logic
  -> convex/agent/conversation.ts
  -> convex/agent/memory.ts
  -> convex/agent/embeddingsCache.ts

LLM Gateway
  -> convex/util/llm.ts
```

## 3. 项目结构怎么读

### 3.1 `src/`：前端界面

这里负责“看得见”的部分。

你会主要看到：

- `src/components/Game.tsx`
  - 游戏主界面
  - 拉默认世界、加载地图和状态
- `src/components/PixiGame.tsx`
  - Pixi 画布里的地图与人物渲染
- `src/components/PlayerDetails.tsx`
  - 右侧人物详情与聊天面板
- `src/components/Messages.tsx`
  - 会话消息列表
- `src/components/MessageInput.tsx`
  - 发消息输入框
- `src/hooks/sendInput.ts`
  - 把前端行为发给后端引擎
- `src/hooks/serverGame.ts`
  - 把后端返回的“序列化世界状态”还原成前端可用对象

一句话总结：

- `src/` 只负责“显示”和“发起动作”
- 真正的游戏规则不在这里

### 3.2 `convex/aiTown/`：游戏规则层

这里是整个项目最核心的一层。

它定义：

- 世界里有哪些对象
- 玩家怎么加入/离开
- 怎么移动
- 什么叫开始会话
- 什么叫正在输入
- 什么叫会话结束

重点文件：

- `main.ts`
  - 引擎启动、停止、调度 `runStep`
- `game.ts`
  - 每一步游戏如何运行
- `inputs.ts`
  - 所有游戏输入的总入口
- `player.ts`
  - 玩家数据结构与玩家输入
- `conversation.ts`
  - 会话数据结构与会话输入
- `agentInputs.ts`
  - AI 异步任务结束后如何把结果写回游戏
- `world.ts`
  - 世界对象
- `worldMap.ts`
  - 地图对象

一句话总结：

- `convex/aiTown/` 决定“世界规则”

### 3.3 `convex/agent/`：NPC 的脑子

这里不是管理“世界规则”，而是管理“NPC 怎么想”。

重点文件：

- `conversation.ts`
  - NPC 对话时如何拼 prompt
  - NPC 开场白、继续聊天、离开时分别怎么生成
- `memory.ts`
  - NPC 如何把对话总结成记忆
  - 如何检索相关记忆
  - 如何给记忆打重要性分数
- `embeddingsCache.ts`
  - embedding 缓存，避免重复算向量

一句话总结：

- `convex/agent/` 决定“NPC 如何思考和说话”

### 3.4 `convex/util/llm.ts`：模型调用网关

这个文件非常重要。

你可以把它理解为：

- 上层：只管构造 prompt
- 这里：统一决定怎么调用 OpenAI / Ollama / Together / custom API

它负责：

- 读取环境变量
- 选择 provider
- 确定聊天模型和 embedding 模型
- 统一发 `chat/completions`
- 统一发 `embeddings`
- 自动重试
- 处理 stop words

一句话总结：

- `llm.ts` 决定“模型怎么接”

## 4. 一次用户操作是怎么流动的

这里用两个最常见的例子说明。

### 4.1 例子一：玩家点击地图移动

流程大致是：

1. 前端捕获点击地图事件
2. 前端调用 `useSendInput(engineId, 'moveTo')`
3. `src/hooks/sendInput.ts` 调用 `api.world.sendWorldInput`
4. 后端把这个输入塞进引擎输入队列
5. 引擎在 step 中处理 `moveTo`
6. `convex/aiTown/player.ts` 更新玩家 pathfinding 状态
7. 后续 tick 中持续推进位置变化
8. 前端订阅世界状态，看到人物动起来

你可以把它记成：

```text
点击地图
-> sendInput
-> 引擎处理输入
-> 世界状态变化
-> 前端自动刷新
```

### 4.2 例子二：NPC 聊天

这条链路是很多人最容易混的部分。

大致流程是：

1. NPC 进入“需要发话”的状态
2. 代理层决定现在该生成哪一类话术
   - 开场白
   - 继续回复
   - 告别离开
3. `convex/agent/conversation.ts` 拉上下文
   - 当前说话人是谁
   - 对方是谁
   - 两人之前有没有聊过
   - 有没有相关记忆
   - 当前聊天记录是什么
4. `conversation.ts` 把这些信息拼成 `system prompt`
5. `conversation.ts` 调 `convex/util/llm.ts` 的 `chatCompletion`
6. `llm.ts` 根据环境变量选择模型提供方并真正发请求
7. 模型返回文本
8. `conversation.ts` 裁掉类似 `Alice to Bob:` 这种前缀
9. 消息被写入 `messages`
10. 前端消息面板刷新

你可以把它记成：

```text
NPC 需要说话
-> conversation.ts 组 prompt
-> llm.ts 调模型
-> 返回一句话
-> 写入 messages
-> UI 刷新
```

## 5. 接口规范怎么理解

项目里最重要的接口不是 REST，而是 Convex 的 query / mutation / internalAction。

## 5.1 面向前端的接口

前端主要使用这几类接口：

### 世界接口

- `api.world.defaultWorldStatus`
- `api.world.worldState`
- `api.world.gameDescriptions`
- `api.world.userStatus`
- `api.world.previousConversation`
- `api.world.joinWorld`
- `api.world.leaveWorld`
- `api.world.heartbeatWorld`
- `api.world.sendWorldInput`

### 消息接口

- `api.messages.listMessages`
- `api.messages.writeMessage`

### 输入状态接口

- `api.aiTown.main.inputStatus`

## 5.2 为什么要有 `sendWorldInput`

这个项目没有把“移动”“邀请聊天”“离开会话”都做成一个个独立 mutation 给前端调。

它采用的是“统一输入系统”：

- 前端只需要说：我要提交一个名字叫 `moveTo` 的输入
- 引擎会在自己的世界节奏里处理它

这有两个好处：

1. 所有状态变化都通过引擎，规则更一致
2. 前端不用知道太多内部细节

### 统一输入调用格式

```ts
api.world.sendWorldInput({
  engineId,
  name,
  args,
});
```

其中：

- `engineId`
  - 当前世界的引擎 ID
- `name`
  - 输入名字，比如 `moveTo`
- `args`
  - 这个输入对应的参数

## 5.3 当前支持的输入大类

### 玩家输入

- `join`
- `leave`
- `moveTo`

### 会话输入

- `startConversation`
- `startTyping`
- `finishSendingMessage`
- `acceptInvite`
- `rejectInvite`
- `leaveConversation`

### 代理输入

- `finishRememberConversation`
- `finishDoSomething`
- `agentFinishSendingMessage`
- `createAgent`

更完整的字段清单，请看：

- `docs/ai-town-interface-spec.md`

## 6. 变量管理怎么分层

这是项目最值得尽早建立的习惯之一。

不要把所有“值”都混在一起。

建议永远把它们分成 3 层：

### 第一层：环境变量

用途：

- 第三方服务地址
- API key
- 模型名称
- 部署环境差异

例子：

- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `TOGETHER_API_KEY`
- `LLM_API_URL`
- `OLLAMA_HOST`
- `OLLAMA_MODEL`
- `REPLICATE_API_TOKEN`

记忆口诀：

- 环境变量 = “项目运行在什么环境”

### 第二层：代码常量

位置：

- `convex/constants.ts`

用途：

- 游戏节奏参数
- 超时
- cooldown
- 距离阈值
- 默认上限

例子：

- `TICK`
- `STEP_INTERVAL`
- `CONVERSATION_DISTANCE`
- `TYPING_TIMEOUT`
- `MAX_HUMAN_PLAYERS`
- `MESSAGE_COOLDOWN`

记忆口诀：

- 常量 = “玩法规则怎么设”

### 第三层：运行时状态

位置：

- 数据库表
- `World` / `Player` / `Conversation` / `Agent` 对象

用途：

- 玩家当前位置
- 某个会话有没有结束
- 某个 NPC 最近一次聊天时间
- 某段消息内容是什么

记忆口诀：

- 运行时状态 = “此刻世界正在发生什么”

## 7. NPC 输出规范怎么理解

这一部分正是你昨天提到的重点。

核心文件：

- `convex/agent/conversation.ts`
- `convex/util/llm.ts`

## 7.1 三种 NPC 文本输出

当前最重要的是 3 类：

### 1. 开场白

函数：

- `startConversationMessage`

意思：

- 两个人刚开始聊时，NPC 第一条说什么

### 2. 继续回复

函数：

- `continueConversationMessage`

意思：

- 聊天已经进行中，NPC 接下来回什么

### 3. 离开时的告别

函数：

- `leaveConversationMessage`

意思：

- NPC 准备结束会话时，说一句比较自然的结束语

## 7.2 `conversation.ts` 里到底在拼什么

你可以把 `conversation.ts` 看成一个“prompt 编排器”。

它做的事不是直接让 NPC 说话，而是先把上下文整理成模型能看懂的说明书。

以 `startConversationMessage` 为例，拼接顺序大致是：

1. 先说明身份和场景

```txt
You are Alice, and you just started a conversation with Bob.
```

2. 加入“关于你自己”的设定

```txt
About you: ...
Your goals for the conversation: ...
```

3. 如果对方也是 AI，再加入“关于对方”的设定

```txt
About Bob: ...
```

4. 如果你们以前聊过，再提醒模型“上次是什么时候聊的”

5. 如果记忆检索命中了相关记忆，就把记忆以列表形式塞进去

6. 如果命中了“和这个人聊过的记忆”，再追加一个指令：

```txt
Be sure to include some detail or question about a previous conversation in your greeting.
```

7. 最后再放一个输出前缀：

```txt
Alice to Bob:
```

这个前缀的作用是：

- 提醒模型现在该轮到谁说话
- 把输出格式固定住

## 7.3 为什么 `continueConversationMessage` 会把历史消息一条条塞进去

因为模型并不会自动知道“刚才聊了什么”。

所以代码会把历史消息转成这种格式：

```txt
Alice to Bob: ...
Bob to Alice: ...
Alice to Bob: ...
```

这样模型很容易看懂：

- 谁在说话
- 对谁说
- 上下文顺序是什么

这比直接塞一大段没有角色标记的文本更稳。

## 7.4 为什么还要 stop words

如果不限制，模型有时会一次生成两轮甚至三轮：

```txt
Alice to Bob: Nice to see you.
Bob to Alice: Nice to see you too.
```

但系统其实只想要“当前说话人的这一句”。

所以 `conversation.ts` 会加 stop words，大意是：

- 一旦模型开始写 `Bob to Alice:` 就停下来

这就是为什么 stop words 很重要。

## 7.5 为什么还要裁前缀

模型有时会真的把下面这段也输出出来：

```txt
Alice to Bob: Nice to see you again.
```

但 UI 真正想展示的是：

```txt
Nice to see you again.
```

所以 `trimContentPrefx` 会把前缀裁掉。

## 8. `llm.ts` 应该怎么理解

这个文件最适合用“网关”来理解。

上层模块不想关心：

- 现在到底是 OpenAI 还是 Ollama
- URL 是什么
- API key 放哪里
- embedding 要打哪个 endpoint
- 429 要不要重试

所以这些都统一放在这里。

## 8.1 `getLLMConfig` 做了什么

它会根据环境变量决定：

- 当前 provider 是谁
- 聊天模型是什么
- embedding 模型是什么
- 请求要发去哪里
- 有没有 provider 特殊 stop words

你可以理解成：

```text
环境变量
-> getLLMConfig
-> 标准化配置对象
```

## 8.2 `chatCompletion` 做了什么

它是当前项目最重要的模型调用函数之一。

做的事情有：

1. 取模型配置
2. 如果调用方没指定 model，就用默认 chat model
3. 合并 stop words
4. 发 `/v1/chat/completions`
5. 如果失败，看是否要重试
6. 如果是流式，返回流包装对象
7. 如果是非流式，取出最终文本

## 8.3 `retryWithBackoff` 为什么重要

模型调用很容易遇到：

- 网络抖动
- 429 限流
- 临时 5xx

如果每个函数都自己写 retry，会很乱。

所以项目把这部分收口成一个统一重试器。

这样上层只需要说：

- 这个错误是否可重试

而不需要每次都自己写 `for` 循环和 `setTimeout`。

## 9. 数据库存了什么

如果你对“世界状态”和“消息状态”容易混，这一节很重要。

### 9.1 世界相关表

- `worlds`
  - 世界主体状态
- `worldStatus`
  - 世界是否活着、默认世界是谁、对应引擎是谁
- `maps`
  - 地图数据
- `playerDescriptions`
  - 玩家名字、角色、描述
- `agentDescriptions`
  - NPC identity / plan

### 9.2 会话与消息相关表

- `messages`
  - 真正的聊天消息正文
- `archivedConversations`
  - 结束后的历史会话
- `participatedTogether`
  - 谁和谁聊过

### 9.3 记忆相关表

- `memories`
  - 记忆正文
- `memoryEmbeddings`
  - 记忆向量

一句话帮助区分：

- `conversation` 偏“会话状态”
- `messages` 偏“会话内容”
- `memories` 偏“会话结束后 NPC 如何记住它”

## 10. 如果你要改功能，先看哪里

### 想改 NPC 人设

先看：

- `data/characters.ts`
- `convex/agent/conversation.ts`

### 想改 NPC 的对话风格

先看：

- `convex/agent/conversation.ts`
- `convex/util/llm.ts`

### 想改模型提供方

先看：

- `convex/util/llm.ts`
- 环境变量配置

### 想改地图

先看：

- `data/gentle.js`
- `convex/init.ts`
- `src/editor/README.md`

### 想改移动规则

先看：

- `convex/aiTown/player.ts`
- `convex/aiTown/movement.ts`

### 想改会话规则

先看：

- `convex/aiTown/conversation.ts`
- `convex/constants.ts`

## 11. 建议的新手阅读路线

如果你要真正开始改代码，推荐按下面路线走：

### 第一天：先搞懂大盘

读：

- 本文
- `docs/ai-town-interface-spec.md`
- `ARCHITECTURE.md`

目标：

- 知道每层职责

### 第二天：只看前后端交互

读：

- `src/components/Game.tsx`
- `src/hooks/serverGame.ts`
- `src/hooks/sendInput.ts`
- `convex/world.ts`
- `convex/messages.ts`

目标：

- 知道前端怎么拿世界状态
- 知道前端怎么发输入

### 第三天：看游戏规则

读：

- `convex/aiTown/inputs.ts`
- `convex/aiTown/player.ts`
- `convex/aiTown/conversation.ts`
- `convex/aiTown/main.ts`

目标：

- 知道世界状态如何变化

### 第四天：看 AI 对话链路

读：

- `convex/agent/conversation.ts`
- `convex/agent/memory.ts`
- `convex/util/llm.ts`

目标：

- 知道 NPC 为什么会说出这句话

## 12. 目前实现里最值得留意的点

### 1. `conversation.ts` 同时负责“查数据 + 拼 prompt + 调模型”

这对理解很方便，但后期会慢慢变重。

以后如果功能继续扩展，可以拆成：

- `promptData.ts`
- `promptBuilder.ts`
- `conversation.ts`

### 2. `NUM_MEMORIES_TO_SEARCH` 现在有双来源

当前既有：

- `convex/constants.ts`

又有：

- `process.env.NUM_MEMORIES_TO_SEARCH`

以后最好统一成一个真源。

### 3. 长度约束现在主要靠 prompt 提示，不是硬限制

比如：

- “within 200 characters”

这是自然语言约束，不是程序裁剪。

如果未来你们很在意稳定长度，最好补代码层校验。

## 13. 配套文档

建议一起看：

- `docs/ai-town-interface-spec.md`
  - 更偏规范、接口、变量分类

## 14. 最后给新手的一个记忆口诀

如果你读到一半又绕晕了，可以反复用这个口诀把自己拉回来：

```text
src 负责显示
aiTown 负责规则
agent 负责思考
llm.ts 负责接模型
```

再补一句数据流口诀：

```text
前端发输入
引擎改世界
代理做思考
模型产文本
前端再显示
```

只要这两句没丢，后面再看具体文件就会顺很多。
