# AI Town Weak GM 完整功能说明

本文档说明本项目新增的 Weak GM 旁路监督层。它的目标不是重写 AI Town，而是在不接管原引擎的前提下，为角色行为增加空间语义、可见性、信息传播、输出审查、客观关系图、发言意愿排序和 debug 可观测性。

核心原则一句话：

```text
GM 不接管 AI Town，只读取原世界状态，在旁路生成语义解释、判断信息可见性、检查输出风险，并在必要时做轻量介入。
```

---

## 0. GM 的边界

### 0.1 GM 做什么

GM 负责新增一层“解释与监督”能力：

1. 把原始坐标解释成 `zone / room / object`。
2. 为每个 agent 生成只属于它自己的 observation。
3. 维护事实传播图，判断“谁知道什么、怎么知道”。
4. 判断 agent 输出是合理推理还是信息泄露。
5. 对泄露输出进行旁路介入，例如静默重生成或拦截写入。
6. 维护客观关系图，记录 agent 之间互动过什么。
7. 根据上下文计算 willingness，决定下一位更应该发言的 agent。
8. 把所有 GM 判断写入独立 debug 记录，不污染世界消息和 agent memory。

### 0.2 GM 不做什么

GM 不替代原 AI Town 引擎：

1. 不维护坐标系统。
2. 不接管地图结构。
3. 不接管路径规划。
4. 不接管碰撞检测。
5. 不接管角色移动。
6. 不接管 engine tick / step。
7. 不直接改 agent memory。
8. 不把“你泄露了信息”写进角色对话。

这些仍然由原项目负责，尤其是：

```text
convex/aiTown/movement.ts
convex/aiTown/worldMap.ts
convex/aiTown/location.ts
convex/engine/abstractGame.ts
convex/aiTown/game.ts
```

GM 的设计是“读取这些状态，然后解释它们”，而不是“替换这些状态”。

---

## 1. 语义空间解释

### 1.1 功能目标

原 AI Town 的世界主要是坐标、地图和移动状态。GM 在其上增加一层语义解释：

```text
x/y 坐标 -> zone -> room -> nearby object -> interactable object
```

例如：

```text
Alice 的坐标在 MeetingRoom 范围内。
Alice 靠近 CenterTable。
CenterTable 上有 Document_A 和 WaterBottle。
Document_A 属于 MeetingRoom / CenterTable 这条空间路径。
```

这样 agent prompt、guard、debug UI 不需要直接理解地图坐标，而可以使用更接近人类语言的空间事实。

### 1.2 树结构组织空间信息

语义空间由 scene graph 表示：

```text
Scene
└── MeetingRoom
    ├── CenterTable
    │   ├── Document_A
    │   └── WaterBottle
    ├── Chair_1
    ├── Door
    └── Whiteboard
```

这里的 scene graph 不是地图引擎，不参与移动、寻路或碰撞。它只是一份语义索引，用来回答：

1. 某个对象属于哪个房间。
2. 某个对象的父节点是谁。
3. 某个对象下面还有哪些子对象。
4. 某个对象从根节点到自己的路径是什么。
5. 某个节点应该如何被描述给 agent 或 debug UI。

### 1.3 已实现文件

#### `convex/GM/spatial/sceneGraph.ts`

实现轻量语义空间树。

主要能力：

1. `createDemoSceneGraph()`：创建 demo 会议室空间树。
2. `findNodeById()`：按 id 查找节点。
3. `getChildren()`：获取某节点子节点。
4. `getParent()`：获取某节点父节点。
5. `getPathToRoot()`：获取从对象到 root 的路径。
6. `describeNode()`：把节点转成可读描述。

用途：

```text
Document_A -> CenterTable -> MeetingRoom -> Scene
```

这让 GM 可以解释“文件在会议室的中间桌上”，而不是只知道一个孤立对象。

#### `convex/GM/spatial/zoneResolver.ts`

实现 demo 级坐标到 zone 的映射。

主要能力：

1. 输入 `{ x, y }`。
2. 根据矩形范围判断在哪个 zone。
3. 返回 `zoneId / zoneName / roomId / roomName / confidence`。
4. 如果坐标不属于任何已知 zone，返回 `unknown`。

它不改变原坐标系统，只做解释。例如：

```text
{ x: 120, y: 88 } -> MeetingRoom
{ x: 20, y: 40 } -> Cafe
unknown -> UnknownRoom
```

#### `convex/GM/spatial/objectResolver.ts`

实现 agent 附近对象判断。

主要能力：

1. 根据 agent 坐标和对象坐标计算距离。
2. 根据 semantic location 匹配同房间对象。
3. 区分 `nearbyObjects` 和 `interactableObjects`。
4. 如果一个对象是容器，例如 `CenterTable`，可沿 scene graph 暴露其子对象，例如 `Document_A`。

示例：

```text
Alice near CenterTable
-> nearbyObjects: CenterTable, Document_A, WaterBottle
-> interactableObjects: CenterTable, Document_A
```

#### `convex/GM/spatial/spatialSemantics.ts`

把 `zoneResolver + sceneGraph + objectResolver` 串起来，生成 agent 的空间摘要。

主要能力：

1. `buildSemanticLocationForAgent()`：生成 agent 的语义位置。
2. `buildSpatialSummaryForAgent()`：生成可读空间描述。

输出示例：

```text
Alice is in MeetingRoom.
Alice is near CenterTable.
Document_A is on CenterTable.
Bob is near Alice.
```

### 1.4 设计收益

1. 坐标系统仍由原 AI Town 管。
2. GM 只做语义解释，保持解耦。
3. prompt、guard、debug 可以使用自然语言空间事实。
4. 后续可以替换 demo zone 为真实地图标注，不影响 guard / perception / willingness 上层逻辑。

---

## 2. 可见性与信息管理

### 2.1 功能目标

GM 为每个 agent 生成不同的 observation，避免所有角色共享上帝视角。

同一个世界状态下，Alice 和 Bob 看到的信息可能不同：

```text
Alice 能看见会议室桌上的 Document_A。
Bob 在同一个房间，可以看见 Alice。
Charlie 在另一个房间，看不见会议室内的人。
hidden fact 默认不会进入任何人的 observation。
shared fact 只给指定 agent。
private fact 只给 owner。
```

### 2.2 可见性规则

已实现的 demo 级规则：

1. 同一 room 默认可见。
2. 不同 room 默认不可见。
3. `public` facts 所有人可见。
4. `private` facts 只有 owner 可见。
5. `shared` facts 只有 `sharedWithAgentIds` 中的 agent 可见。
6. `hidden` facts 默认没人可见，除非 `knownBy` 或信息图证明 agent 已经知道。
7. 遮挡、墙体、视野角度暂时留 TODO，后续可扩展。

### 2.3 可听性规则

已实现的 demo 级规则：

1. 同一 conversation 的参与者可听。
2. 同一 room 且不是 whisper 的发言可听。
3. whisper 只给 target agent。
4. 不同 room 默认不可听。

这保证私聊不会被不相关 agent 听到，公开同房间讲话则可以被附近 agent 听到。

### 2.4 信息传播有向图

信息图解决的问题是：

```text
Bob 是否有合法路径知道 F001？
Bob 是自己看见的，还是 Alice 告诉他的？
某个 hidden fact 从谁传播到了谁？
```

GM 把事实看作节点，把传播看作边：

```text
Fact F001
Alice knows F001
Alice -> Bob: told_in_conversation
Bob now has knowledge path to F001
```

如果 Bob 没有路径知道 F001，却直接说出了 F001 的隐藏内容，guard 就可以判为 leakage。

### 2.5 已实现文件

#### `convex/GM/perception/visibilityResolver.ts`

负责判断 agent 能看见谁、能看见哪些事实。

主要能力：

1. `canSeeActor()`：判断两个 agent 是否可见。
2. `canSeeFact()`：判断某 agent 是否可见某 fact。
3. `resolveVisibleActors()`：生成可见 agent 列表。
4. `resolveVisibleFacts()`：生成可见 facts 列表。

它只接收 GM context，不改原世界状态。

#### `convex/GM/perception/audibleResolver.ts`

负责判断 agent 能听到哪些消息。

主要能力：

1. 判断是否同 conversation。
2. 判断是否同 room。
3. 判断 whisper target。
4. 生成 audible recent messages。

#### `convex/GM/perception/observationBuilder.ts`

负责生成 agent 专属 observation。

observation 内容包括：

1. 当前 room / zone。
2. nearby agents。
3. visible objects。
4. visible facts。
5. audible recent messages。

注意：

```text
observation 不包含 hidden/private 未授权事实。
```

#### `convex/GM/perception/perception.ts`

perception 总入口。

主要能力：

1. `buildPerceptionForAgent()`：为单个 agent 生成 observation。
2. `buildPerceptionsForConversation()`：为一场 conversation 的所有参与者生成各自 observation。

#### `convex/GM/graph/graphUtils.ts`

通用有向图工具。

主要能力：

1. `addDirectedEdge()`。
2. `getOutgoingEdges()`。
3. `getIncomingEdges()`。
4. `findPath()`。
5. `hasPath()`。

示例：

```text
A -> B -> C
hasPath(A, C) = true
```

#### `convex/GM/graph/informationGraph.ts`

维护事实节点和事实传播边。

主要能力：

1. `addFact()`：增加 fact。
2. `markKnownBy()`：标记某 agent 知道某 fact。
3. `hasKnowledgePath()`：判断 agent 是否有合法路径知道 fact。
4. `getKnownFacts()`：获取某 agent 已知 facts。
5. `explainKnowledgePath()`：解释知识来源路径。

这部分是输出审查的基础。

### 2.6 数据表规划

`convex/GM/schema.ts` 中规划了以下 GM 表：

```text
gmFacts
gmFactEdges
gmDebugLogs
gmRelationEdges
gmWillingnessLogs
```

目前这些 schema 先放在 GM 模块内，后续可接入 root Convex schema。这样做是为了先把 GM 数据契约和 GM 逻辑放在一起，避免过早污染原项目数据结构。

---

## 3. 输出审查

### 3.1 功能目标

GM 判断 agent 输出属于哪一类：

```text
pass
reasonable_inference
personality_based_guess
unsupported_but_harmless
possible_leakage
clear_leakage
physical_impossible
```

核心原则：

```text
GM 不判断猜测是否真实。
GM 只判断这个 agent 是否有合理依据说出这句话。
```

例如：

```text
I suspect Alice may know something.
```

如果 Bob 知道文件丢了、Alice 进过会议室、Alice 最近紧张，那么这是合理怀疑。即使 Alice 其实无辜，GM 也不会拦截。

但如果 Bob 没有任何知识路径，却直接说：

```text
I know Charlie hid the key under the sofa.
```

并且 `Charlie hid the key under the sofa` 是 hidden fact，GM 会判为 leakage。

### 3.2 Level 0-3 介入等级

GM 使用 4 个介入等级：

```text
Level 0: pass
Level 1: regenerate
Level 2: rewrite_demo
Level 3: reject_or_rollback
```

#### Level 0：仅记录，不干预

适用情况：

1. 合理推理。
2. 性格化猜测。
3. 没有明确泄露隐藏事实。
4. 输出虽然没有完全证据，但 harmless。

处理方式：

```text
允许写入 messages。
允许后续 memory 链路自然读取。
只写 GM debug log。
```

#### Level 1：静默重生成

适用情况：

1. 可能泄露。
2. 可通过一次重写修正。

处理方式：

```text
不把“你泄露了”写入世界。
后台构造 regeneration prompt。
只重试 1 次。
重试结果再过一次 guard。
通过才写入 messages。
```

#### Level 2：demo 改写

适用情况：

1. demo 展示需要把泄露句改成模糊表达。
2. 不适合真实生产自动使用。

处理方式：

```text
把明确隐藏事实改成模糊说法。
例如 “Charlie hid the key under the sofa”
改成 “I feel someone may be hiding something.”
```

#### Level 3：拒绝或回滚计划

适用情况：

1. clear leakage。
2. 重生成后仍然不通过。
3. 物理不可能或明显破坏世界规则。

处理方式：

```text
shouldWriteMessage = false
shouldWriteMemory = false
shouldUpdateWorld = false
shouldWriteDebug = true
```

也就是说，错误文本不进入 messages，自然也不会进入后续 memory 总结链路。

### 3.3 静默内部重生成

“告知 agent 泄露”不是让角色在游戏世界里说：

```text
我刚刚泄露了信息。
```

而是后台给 LLM 一次更窄的重生成约束：

```text
你刚才引用了当前角色无权直接陈述的信息。
请只基于当前 observation、合法记忆、公开信息重写。
合理怀疑允许，直接陈述隐藏事实不允许。
```

这条提示只存在于 GM 旁路链路中，不进入：

```text
messages
memories
archivedConversations
角色对话正文
```

### 3.4 已实现文件

#### `convex/GM/guard/leakageDetector.ts`

规则级泄露检测。

主要能力：

1. 检查 output 是否包含 hidden/private fact 的关键词或具体内容。
2. 检查 agent 是否有 known path。
3. 无合法路径且直接命中隐藏事实时，返回 `possible_leakage` 或 `clear_leakage`。

当前 demo 版本使用关键词和 substring，后续可接 LLM judge。

#### `convex/GM/guard/inferenceJudge.ts`

判断合理推理和性格化猜测。

主要规则：

1. 如果输出包含 `suspect / maybe / I think / I feel` 等不确定表达。
2. 且没有直接说出 hidden fact 的具体内容。
3. 则判为 `reasonable_inference` 或 `personality_based_guess`。

这里特别强调：

```text
GM 不判断猜测是否真实，只判断 agent 是否有合理依据说出。
```

#### `convex/GM/guard/guardPrompt.ts`

未来接 GM LLM judge 的 prompt 模板。

模板要求：

1. 不要判断猜测是否真实。
2. 只判断该 agent 是否有合理依据说出。
3. 合理怀疑和性格化推理判 Level 0。
4. 只有直接陈述无权限隐藏事实才判 leakage。
5. 输出结构化 JSON。

#### `convex/GM/guard/knowledgeGuard.ts`

输出审查总入口。

核心流程：

```text
judgeOutput(agentId, output, context)
-> leakageDetector
-> inferenceJudge
-> GMGuardResult
```

当前实现：

1. 优先检查 clear leakage。
2. 再检查 reasonable inference。
3. 合理推理必须 Level 0。
4. 明确泄露才进入 Level 1 或 Level 3。

#### `convex/GM/intervention/intervention.ts`

根据 guard result 决定介入动作。

映射关系：

```text
Level 0 -> pass
Level 1 -> regenerate
Level 2 -> rewrite_demo
Level 3 -> reject_or_rollback
```

#### `convex/GM/intervention/regenerate.ts`

生成静默重生成提示。

它不写入世界消息，只返回给生成链路二次调用 LLM。

#### `convex/GM/intervention/rewriteForDemo.ts`

demo 用改写器，用于把明确泄露表达降级成模糊表达。

#### `convex/GM/intervention/rollbackPlan.ts`

生成回滚计划。

clear leakage 时：

```text
shouldWriteMessage = false
shouldWriteMemory = false
```

这样错误文本不会进入 message，也不会被 memory 总结读到。

### 3.5 Bridge 接入

#### `convex/GM/bridge/conversationGuardBridge.ts`

封装消息生成后的 guard。

输入：

```text
agentId
conversationId
rawOutput
gmContext
```

输出：

```text
shouldWrite
shouldRegenerate
finalOutput
regenerationPrompt
rollbackPlan
debugRecord
```

特点：

1. 桥接层不承载规则本身。
2. 规则仍在 guard / intervention 模块。
3. 未来原 conversation pipeline 只需要调用这个桥。

#### `convex/GM/bridge/promptBridge.ts`

把 GM observation 附加到 prompt 末尾。

原则：

```text
不改变原 prompt 主体。
只追加 GM Observation section。
不包含 hidden/private 未授权事实。
```

#### `convex/GM/bridge/inputBridge.ts`

预留动作级 GM 接入点，目前保持轻量。

### 3.6 真实接线位置

#### `convex/aiTown/agentOperations.ts`

这里做了最小接入，位置在：

```text
agentGenerateMessage()
```

流程：

```text
第一次生成 rawOutput
-> buildGMRuntimeContextForConversation()
-> guardGeneratedMessage()
-> 如果 Level 0，写入原文本
-> 如果 Level 1，静默重生成 1 次
-> 第二次再 guard
-> 通过写入 regeneratedText
-> 不通过 abort，不写入 messages
```

关键约束：

1. 不在 `conversation.ts` 里塞入 guard 规则。
2. 不把 GM 判断写入 agent 对话。
3. 不多轮无限重试。
4. 重生成失败后不回退写入原始泄露文本。

#### `convex/aiTown/agentInputs.ts`

新增或调整了 `agentAbortSendingMessage` 的处理。

作用：

```text
释放 typing 状态。
不推进 lastMessage。
不增加 numMessages。
不写入实际消息。
```

这样 GM 拦截时，世界不会误以为 agent 已经成功发言。

---

## 4. Agent 关系管理

### 4.1 功能目标

GM 维护“客观关系图”，不是主观情感图。

它记录的是：

```text
Alice 和 Bob 是否互动过。
互动了几次。
最后一次互动是什么时候。
共同经历过哪些事件。
是否有公开关系摘要。
```

它不直接决定：

```text
trust
suspicion
affection
hate
```

这些主观关系仍然应该由 agent reflection / memory 产生。

### 4.2 有向图设计

关系边是有向的：

```text
Alice -> Bob
Bob -> Alice
```

这两条边不同。

原因：

```text
Alice 主动找 Bob 说过 3 次。
Bob 可能只回应过 Alice 1 次。
```

GM 只记录客观互动，不替角色下判断。

### 4.3 已实现文件

#### `convex/GM/graph/relationGraph.ts`

主要能力：

1. `recordInteraction(fromAgentId, toAgentId, eventId)`：记录一次互动。
2. `getRelationEdge(fromAgentId, toAgentId)`：获取一条有向关系边。
3. `summarizeRelation(fromAgentId, toAgentId)`：生成客观摘要。

关系边字段包括：

```text
fromAgentId
toAgentId
interactionCount
lastInteractionAt
sharedEventIds
relationSummary
updatedAt
```

### 4.4 行为约束中的用途

关系图可以辅助 GM 判断：

1. agent 是否有理由提到另一个 agent。
2. agent 是否和某人互动过。
3. 某次发言中的关系暗示是否有客观依据。
4. willingness 是否因为“被熟人点名”而加分。

但它不会替角色自动生成“我讨厌 Bob”这样的主观判断。

---

## 5. Willingness 发言顺序

### 5.1 功能目标

原始对话如果固定轮换，容易出现不自然现象：

```text
Alice -> Bob -> Charlie -> Alice -> Bob -> Charlie
```

但真实对话里，下一位发言者通常取决于上下文：

```text
谁被直接问了？
谁掌握相关信息？
谁刚刚发言过？
谁听得到？
谁性格更外向？
谁当前目标需要解释？
```

Willingness 模块为每个参与者计算发言意愿分数，然后排序决定下一位更应该说话的人。

### 5.2 触发条件

GM 不每句话都重算 willingness，避免过度干预。

只有关键变化时才触发：

```text
first_round
new_participant_joined
direct_question
agent_mentioned
new_information
topic_changed
manual_refresh
```

示例：

```text
第一轮对话 -> 重算
新 agent 加入 -> 重算
Alice 直接问 Bob -> 重算
Charlie 被点名 -> 重算
有人获得新信息 -> 重算
话题变化 -> 重算
普通闲聊延续 -> 不重算
```

### 5.3 评分因素

当前实现分为两层：

1. **推荐主路径**：由外部 agent 自评分，再由 GM 在触发点消费这些分数并稳定排序。
2. **兼容兜底路径**：GM 内部仍保留 demo 评分器，供测试和过渡期使用。

内部 demo 评分规则如下：

```text
+40 被直接提问
+30 被点名
+25 掌握相关信息
+20 当前目标要求回应
+15 刚获得新信息
+10 性格外向
-10 性格谨慎/沉默
-15 刚刚已经发言
-30 不在场或听不到
```

示例：

```text
Bob 被 Alice 直接问到: +40
Bob 知道相关事实: +25
Bob 刚刚已经说过话: -15
Bob 性格谨慎: -10
Bob 当前目标是澄清误会: +20
最终 score = 60
```

### 5.4 排序规则

排序不是固定轮换，而是：

```text
participants
-> calculate willingness scores
-> sort by score desc
-> tie-breaker
-> selectedNextSpeaker
```

平分时 tie-breaker：

1. 被直接提问优先。
2. 更久没说话优先。
3. `agentId` 稳定排序兜底。

### 5.5 已实现文件

#### `convex/GM/willingness/willingnessTypes.ts`

定义 willingness 类型：

```text
GMWillingnessScore
GMWillingnessContext
GMWillingnessFactor
GMTurnOrderResult
GMWillingnessTriggerReason
```

#### `convex/GM/willingness/willingnessTrigger.ts`

判断是否需要重算。

主要函数：

```text
shouldRecomputeWillingness(context)
```

只有关键变化返回触发原因，否则返回 false / undefined。

#### `convex/GM/willingness/willingnessCalculator.ts`

计算每个 agent 的分数。

输入包括：

```text
conversation participants
current speaker
latest message
agent profiles
visible facts
relation graph
information graph
heardByAgentIds
```

输出每个 agent 的：

```text
score
factors
reason
canSpeak
```

#### `convex/GM/willingness/turnOrderResolver.ts`

根据分数排序并选择下一位发言者。

主要函数：

```text
resolveTurnOrder(scores, triggerReason)
selectNextSpeaker(scores)
resolveTurnOrderFromExternalScores(scores, triggerReason)
buildGMWillingnessExtensionRequest(...)
```

新增能力：

1. 接收外部 willingness 分数。
2. 按固定稳定规则排序。
3. 在最高分同分时生成 GM 扩展请求。
4. 当前只留接口，不真正执行 GM tie-break 模型。

#### `convex/GM/willingness/willingnessDebug.ts`

生成 debug record。

记录：

```text
conversationId
triggerReason
participants
scores
ranking
selectedNextSpeaker
reasonForEachScore
```

---

## 6. Runtime 总入口

### 6.1 已实现文件

#### `convex/GM/runtime/gmContextLoader.ts`

负责只读加载原 AI Town 状态，并标准化为 GM context。

主要能力：

1. `normalizeGMContext()`：把任意来源 snapshot 整理成统一 GMRuntimeContext。
2. `buildGMContextFromSnapshots()`：用已有 world / descriptions / messages 快照构造 GM context。
3. `loadGMContext()`：从 Convex DB 读取世界状态。
4. `loadConversationContext()`：缩小到某个 conversation。
5. `loadAgentContext()`：缩小到某个 agent。

设计重点：

```text
只读，不写原状态。
未知表和后续真实接线点用 TODO 保留。
```

#### `convex/GM/runtime/gmPipeline.ts`

串联 GM 流程：

```text
load context
-> spatial semantics
-> perception
-> graph update
-> guard
-> intervention
-> debug log
```

当前是 demo-friendly pipeline，方便后续扩展。

#### `convex/GM/runtime/gmRuntime.ts`

GM 对外总入口类。

主要方法：

```text
buildAgentObservation()
buildConversationObservations()
checkAgentMessage()
checkActionIntent()
shouldRefreshTurnOrder()
resolveTurnOrderFromExternalScores()
buildWillingnessExtensionRequest()
resolveTurnOrder()
recordGMEvent()
```

这让上层接入时不用关心 GM 内部模块细节。

---

## 7. Debug 与 UI

### 7.1 Debug 原则

GM debug 只给开发者和操作者看，不给角色看。

它不会写入：

```text
messages
memories
archivedConversations
角色对话正文
```

### 7.2 已实现文件

#### `convex/GM/debug/debugTypes.ts`

定义 debug record 类型：

```text
GMDebugRecord
GMGuardDebugRecord
GMWillingnessDebugRecord
GMSpatialDebugRecord
```

#### `convex/GM/debug/debugLog.ts`

demo 级 debug logger。

主要能力：

```text
recordGuardDebug()
recordSpatialDebug()
recordWillingnessDebug()
```

当前可返回 record 或 console，不强制写数据库。

#### `convex/GM/debug/debugQueries.ts`

预留 debug 查询能力。

面向后续：

1. 最近 GM 判断。
2. 最近泄露检测。
3. 某 agent 可见信息。
4. 某 fact 传播路径。
5. 某 conversation 的 willingness 排序。

#### `src/components/GMDebugPanel.tsx`

新增前端 GM debug 面板。

展示 6 块信息：

1. 最近 GM 介入提示。
2. 最近 GM guard 判断。
3. 最近 willingness 排序。
4. 当前 agent 可见信息。
5. fact 传播路径。
6. intervention level 说明。

它追加在原 `SceneDebugPanel` 下方，不替换原 UI。

#### `src/components/gmDebugMock.ts`

为 `GMDebugPanel` 提供 mock 数据。

这样在后端真实 debug query 接好之前，UI 结构、文案和视觉位置已经能先验证。

#### `src/components/Game.tsx`

在 debug 侧栏中新增：

```tsx
<SceneDebugPanel worldId={worldId} />
<GMDebugPanel worldId={worldId} />
```

保持原 `SceneDebugPanel` 不变，只追加 GM 面板。

---

## 8. 工具动作反馈

### 8.1 功能目标

agent 可能说自己要执行某个动作：

```text
查看公告板
登记报名
贴通知
整理桌面
发送邮件
```

但不是所有动作都有真实 API。GM tools 模块把动作分为：

```text
real_tool
simulated_tool
narrative_only
```

### 8.2 已实现文件

#### `convex/GM/tools/toolRegistry.ts`

定义 demo 工具注册表。

示例：

```text
send_email -> real_tool 或 unavailable
check_notice_board -> simulated_tool
tidy_table -> narrative_only
```

#### `convex/GM/tools/simulatedToolHandler.ts`

处理无真实 API 的模拟动作。

支持：

```text
check_notice_board
post_notice
sign_up
tidy_table
```

#### `convex/GM/tools/toolOutcome.ts`

定义统一工具返回：

```text
success
failed
unavailable
recorded_only
```

---

## 9. LLM 模型配置

### 9.1 强制聊天模型

已新增：

```text
convex/util/llmDefaults.ts
```

当前默认：

```text
DEFAULT_CHAT_PROVIDER = custom
DEFAULT_CHAT_API_URL = https://api.chatanywhere.tech
DEFAULT_CHAT_MODEL = deepseek-v4-flash
DEFAULT_CHAT_API_KEY_ENV = DEEPSEEK_API_KEY
```

### 9.2 强制覆盖调用方 model

已修改：

```text
convex/util/llm.ts
```

聊天请求发送前会执行：

```text
body.model = config.model
```

所以即使某个调用方传了别的 model，也会被覆盖成：

```text
deepseek-v4-flash
```

### 9.3 Embedding 保持独立

embedding 没有强制使用 `deepseek-v4-flash`。

如果使用 ChatAnywhere 代理做 embedding，可以配置：

```bash
npx convex env set EMBEDDING_PROVIDER "custom"
npx convex env set EMBEDDING_API_URL "https://api.chatanywhere.tech"
npx convex env set EMBEDDING_API_KEY "your-key"
npx convex env set EMBEDDING_MODEL "text-embedding-3-small"
```

聊天 key 可以配置：

```bash
npx convex env set CHAT_API_KEY "your-key"
```

---

## 10. 测试覆盖

GM 测试文件位于：

```text
convex/GM/tests/
```

已覆盖方向：

1. `spatialSemantics.test.ts`：坐标、房间、对象树。
2. `perception.test.ts`：同房间可见、不同房间不可见、hidden/shared fact。
3. `informationGraph.test.ts`：事实传播路径。
4. `relationGraph.test.ts`：有向关系边。
5. `knowledgeGuard.test.ts`：合理怀疑、性格化猜测、明确泄露。
6. `intervention.test.ts`：重生成提示和 rollback plan。
7. `willingness.test.ts`：触发条件、评分、排序。
8. `conversationGuardBridge.test.ts`：桥接层输出。
9. `graphUtils.test.ts`：基础有向图工具。

---

## 11. 改动文件总览

### 11.1 新增 GM 核心目录

```text
convex/GM/
```

包含：

```text
README.md
index.ts
schema.ts
gmConfig.ts
gmTypes.ts
runtime/
spatial/
perception/
graph/
guard/
intervention/
tools/
debug/
bridge/
willingness/
tests/
```

### 11.2 新增或修改的后端接入文件

```text
convex/aiTown/agentOperations.ts
```

作用：

```text
在 agentGenerateMessage() 中接入 GM guard。
实现一次静默重生成。
失败时 abort，不写入 messages。
```

```text
convex/aiTown/agentInputs.ts
```

作用：

```text
增加或调整 agentAbortSendingMessage。
GM 拦截时只释放 typing 状态，不推进对话计数。
```

```text
convex/agent/conversation.ts
```

作用：

```text
保留原 conversation 生成职责。
不承载 GM 审查规则。
继续通过 chatCompletion 调用 LLM。
```

```text
convex/util/llm.ts
convex/util/llmDefaults.ts
```

作用：

```text
强制聊天模型 deepseek-v4-flash。
默认使用 ChatAnywhere OpenAI-compatible endpoint。
embedding 保持独立配置。
```

### 11.3 新增或修改的前端文件

```text
src/components/GMDebugPanel.tsx
src/components/gmDebugMock.ts
src/components/Game.tsx
```

作用：

```text
增加 GM debug 面板。
展示 GM 介入、guard、willingness、可见事实和传播路径。
保持原 SceneDebugPanel 不变。
```

### 11.4 新增文档文件

```text
docs/gm-complete-function-guide-zh.md
```

作用：

```text
记录 GM 完整功能、边界、模块职责和改动文件。
```

---

## 12. 一次完整 GM 工作流

下面是一条 agent 发言从生成到落库的完整流程：

```text
1. 原 AI Town 推进 conversation。
2. agentGenerateMessage() 调用原 conversation 生成 rawOutput。
3. GM 只读 world / descriptions / messages，构造 GMRuntimeContext。
4. GM 根据坐标生成 semantic location。
5. GM 根据 visibility/audible 生成 agent observation。
6. GM 根据 informationGraph 判断 agent known facts。
7. knowledgeGuard 检查 rawOutput。
8. 如果是 reasonable inference，Level 0，允许写入。
9. 如果是 possible leakage，Level 1，生成 regenerationPrompt。
10. 后台只重试 1 次。
11. 第二版再过 guard。
12. 通过则写入 regeneratedText。
13. 不通过则 abort，不写 messages，不写 memory。
14. GM debug record 独立记录整个判断过程。
15. Debug UI 可以显示“本轮 GM 已介入/已重生成/已拦截”。
```

---

## 13. 当前实现状态

已完成：

1. GM 文件夹完整模块化。
2. 语义空间树和 zone/object demo resolver。
3. agent-specific perception。
4. 信息传播图和关系图。
5. 规则级 knowledge guard。
6. Level 0-3 intervention 策略。
7. 静默重生成链路。
8. rollback plan。
9. 独立 debug record。
10. GMDebugPanel mock UI。
11. willingness 触发、评分、排序、debug。
12. 工具动作 demo registry 和 simulated handler。
13. LLM 聊天模型强制为 `deepseek-v4-flash`。

后续可扩展：

1. 把 `convex/GM/schema.ts` 的表接入 root schema。
2. 把 debug logs 从内存/console 接到 Convex 表。
3. 把 demo scene graph 替换为真实地图语义标注。
4. 接入 LLM judge，替换或增强规则级 leakage detector。
5. 在真实 UI 中接入 GM debug query。
6. 为工具动作接真实 API。
7. 为 visibility 增加遮挡、墙体、视野角度。

---

## 14. 最后总结

1. **语义空间解释**：GM 不维护移动，只读取原坐标，把坐标解释成 zone / room / object，并用 scene graph 组织房间、物品和可交互点。
2. **可见性与信息管理**：GM 为每个 agent 生成不同 observation，维护信息传播有向图，判断谁知道什么、通过什么路径知道。
3. **输出审查**：GM 判断 agent 输出是合理推理还是信息泄露；合理推理 Level 0，只写 debug；明确泄露才重生成、改写或拦截。
4. **Agent 关系管理**：GM 维护客观关系有向图，记录互动次数和共享事件，不替 agent 生成主观好恶。
5. **Willingness 发言顺序**：GM 在关键节点计算每个 agent 的发言意愿得分，按分数决定下一位发言者，而不是固定轮换。
