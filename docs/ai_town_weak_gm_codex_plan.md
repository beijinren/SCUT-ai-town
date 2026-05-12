# AI Town Weak GM 工程实现规划与 Codex 分步任务清单

## 0. 总目标

本文件把 Weak GM 的设计规划与 Codex 可执行任务合并成一个执行文档。

核心原则：

> GM 不接管 AI Town，只作为高度解耦的旁路监督层：读取原世界状态，生成语义解释，检查 agent 输出，记录 debug，并在必要时轻量介入。

原 AI Town 已经负责：

1. 坐标系统
2. 地图结构
3. 路径规划
4. 碰撞检测
5. 角色移动
6. 会话状态
7. 消息系统
8. Agent memory / embeddings
9. Engine step / tick
10. 输入队列和状态回写

GM 只新增：

1. 坐标到语义空间的解释
2. 每个 agent 的可见性 / 可听性 / 可交互性判断
3. 信息传播图：谁知道什么、怎么知道
4. Agent 客观关系图：谁和谁互动过
5. 输出审查：合理推理 vs 信息泄露
6. 独立 GM debug log
7. 必要时介入：重生成 / demo 改写 / 拒绝或回滚
8. willingness 发言意愿排序

---

## 1. GM 的核心设计原则

### 1.1 不改原引擎

不要改或尽量不改：

```text
convex/aiTown/movement.ts
convex/aiTown/worldMap.ts
convex/aiTown/location.ts
convex/engine/abstractGame.ts
convex/aiTown/game.ts
```

原因：

原 AI Town 已经用坐标、地图、路径规划和碰撞检测维护移动。GM 读取这些信息，在其上生成 zone / room / object 等语义层即可。

### 1.2 GM 高度解耦

推荐新建：

```text
convex/gm/
```

所有 GM 相关文件尽量放在这里。

原项目中只保留最少桥接点，比如：

```text
NPC 生成消息之后，写入 messages 之前
→ 调用 GM guard
→ 通过后才写入
```

### 1.3 合理推理是 Level 0

如果 agent 是基于已知信息、当前观察、记忆、性格做出的合理猜测或推理，即使结论不确定，也应判为 Level 0。

GM 不判断“猜测是否真实”，GM 只判断：

```text
这个 agent 是否有合理依据说出这句话？
```

例如 Bob 知道文件丢了、Alice 单独进过会议室、Alice 最近紧张，于是 Bob 说：

```text
I suspect Alice may know something about the missing document.
```

这是 Level 0，不拦截，只写 GM debug log。

只有当 agent 明确说出自己没有证据知道的隐藏事实时，才介入。

### 1.4 GM debug log 单独保存

GM 的判断、介入、重生成记录必须进入独立 debug log。

不要写入：

```text
messages
memories
archivedConversations
```

避免污染 agent 记忆。

---

## 2. 完整 GM 文件结构规划

```text
convex/gm/
├── README.md
├── index.ts
├── gmConfig.ts
├── gmTypes.ts
│
├── runtime/
│   ├── gmRuntime.ts
│   ├── gmContextLoader.ts
│   └── gmPipeline.ts
│
├── spatial/
│   ├── spatialSemantics.ts
│   ├── sceneGraph.ts
│   ├── zoneResolver.ts
│   └── objectResolver.ts
│
├── perception/
│   ├── perception.ts
│   ├── visibilityResolver.ts
│   ├── audibleResolver.ts
│   └── observationBuilder.ts
│
├── graph/
│   ├── relationGraph.ts
│   ├── informationGraph.ts
│   └── graphUtils.ts
│
├── guard/
│   ├── knowledgeGuard.ts
│   ├── inferenceJudge.ts
│   ├── leakageDetector.ts
│   └── guardPrompt.ts
│
├── intervention/
│   ├── intervention.ts
│   ├── regenerate.ts
│   ├── rewriteForDemo.ts
│   └── rollbackPlan.ts
│
├── tools/
│   ├── toolOutcome.ts
│   ├── toolRegistry.ts
│   └── simulatedToolHandler.ts
│
├── debug/
│   ├── debugLog.ts
│   ├── debugTypes.ts
│   └── debugQueries.ts
│
├── bridge/
│   ├── promptBridge.ts
│   ├── conversationGuardBridge.ts
│   └── inputBridge.ts
│
├── willingness/
│   ├── willingnessTypes.ts
│   ├── willingnessCalculator.ts
│   ├── turnOrderResolver.ts
│   ├── willingnessTrigger.ts
│   └── willingnessDebug.ts
│
└── tests/
    ├── spatialSemantics.test.ts
    ├── perception.test.ts
    ├── informationGraph.test.ts
    ├── knowledgeGuard.test.ts
    ├── intervention.test.ts
    └── willingness.test.ts
```

---

## 3. 模块说明

### 3.1 `runtime/`

负责 GM 总流程。

#### `gmContextLoader.ts`

只读原 AI Town 状态：

```text
world
worldMap
players / agents
locations
conversations
messages
memories
sceneState
```

注意：只读，不改原状态。

#### `gmPipeline.ts`

串联 GM 流程：

```text
load context
→ spatial semantics
→ perception
→ graph update
→ guard
→ intervention
→ debug log
```

#### `gmRuntime.ts`

GM 对外总入口：

```text
buildAgentObservation()
checkAgentMessage()
checkActionIntent()
resolveTurnOrder()
recordGMEvent()
```

---

### 3.2 `spatial/`

负责语义空间。

#### `sceneGraph.ts`

维护语义空间树：

```text
Scene → Room / Zone → Object → SubObject
```

例如：

```text
MeetingRoom
├── CenterTable
│   ├── Document_A
│   └── WaterBottle
└── Chairs
    ├── Chair_1
    └── Chair_2
```

注意：这不是地图引擎，只是语义索引。

#### `zoneResolver.ts`

负责：

```text
x/y → zone / room
```

例如：

```text
x=120,y=88 → MeetingRoom
```

#### `objectResolver.ts`

负责：

```text
agent 附近有什么 object？
agent 是否靠近某个 object？
agent 是否可交互某个 object？
```

#### `spatialSemantics.ts`

综合生成语义描述：

```text
Alice is in MeetingRoom.
Alice is near CenterTable.
Bob is visible to Alice.
Document_A is on CenterTable.
```

---

### 3.3 `perception/`

负责生成每个 agent 的专属观察。

#### `visibilityResolver.ts`

判断：

```text
是否同一区域？
距离是否够近？
是否有遮挡？
事实是否 public/shared/private/hidden？
```

#### `audibleResolver.ts`

判断：

```text
谁能听到当前发言？
是否私聊？
是否隔墙？
是否正常音量？
```

#### `observationBuilder.ts`

输出 agent-specific observation：

```text
For Alice:
- You are in the meeting room.
- Bob is near the center table.
- You can see Document_A on the table.
- You do not see Charlie.
```

#### `perception.ts`

总入口：

```text
buildPerceptionForAgent(agentId)
```

---

### 3.4 `graph/`

负责关系图和信息图。

#### `relationGraph.ts`

记录客观互动边：

```text
Alice → Bob:
- interactionCount
- lastInteraction
- sharedEvents
- publicRelation
- evidence
```

注意：

GM 可以保存客观互动，但不要直接替 agent 决定 trust / suspicion / affection。主观关系应由 agent reflection 产生。

#### `informationGraph.ts`

记录事实传播路径：

```text
factId
content
visibility
knownBy
source
path
evidenceEvents
```

用于回答：

```text
Bob 是否有合法路径知道 F001？
```

#### `graphUtils.ts`

通用图操作：

```text
addEdge
findPath
hasKnowledgePath
getKnownFacts(agentId)
```

---

### 3.5 `guard/`

负责输出审查。

#### `knowledgeGuard.ts`

总入口：

```text
judgeOutput(agentId, output, gmContext)
```

输出分类：

```text
reasonable_inference
personality_based_guess
unsupported_but_harmless
possible_leakage
clear_leakage
physical_impossible
```

#### `inferenceJudge.ts`

判断输出是否属于合理推理：

```text
已知事实 + agent 性格 + 当前观察 + 记忆
→ 是否足以支持该输出？
```

允许：

```text
怀疑
猜测
模糊推断
性格化偏见
```

只要没有直接说出隐藏事实，就尽量 Level 0。

#### `leakageDetector.ts`

检测：

```text
是否出现 hidden/private fact 的具体内容？
是否没有 known path？
是否没有 memory evidence？
```

#### `guardPrompt.ts`

存放 GM LLM prompt。

核心指令：

```text
不要判断这个猜测是否真实。
只判断该 agent 是否有合理依据说出这句话。
合理怀疑和性格化推理应判为 Level 0。
只有直接陈述无权限隐藏事实，才判为 leakage。
```





---

### 3.6 `intervention/`

负责介入策略。

#### `intervention.ts`

根据 guard 结果返回：

```text
Level 0 pass
Level 1 regenerate
Level 2 rewrite_demo
Level 3 reject_or_rollback
```

#### `regenerate.ts`

构造重生成提示：

```text
你刚才引用了当前角色无权知道的信息。
请只基于该角色的记忆、观察和公开信息重新回答。
```

#### `rewriteForDemo.ts`

只用于 demo，将泄露句子改成模糊表达。

#### `rollbackPlan.ts`

生成回滚计划：

```text
shouldRemoveMessage
shouldSkipMemoryWrite
shouldMarkViolation
```

---

### 3.7 `tools/`

处理工具动作。

#### `toolRegistry.ts`

登记：

```text
real tools
simulated tools
narrative-only actions
```

#### `simulatedToolHandler.ts`

处理无真实 API 的动作：

```text
查看公告板
登记报名
贴通知
整理桌面
```

#### `toolOutcome.ts`

统一返回：

```text
success
failed
unavailable
recorded_only
```

---

### 3.8 `debug/`

负责独立 GM debug 日志。

#### `debugLog.ts`

记录：

```text
agentId
conversationId
eventId
rawOutput
visibleFacts
hiddenFactsMatched
reasoningType
interventionLevel
decision
regeneratedOutput
timestamp
```

#### `debugQueries.ts`

提供查询：

```text
最近 GM 判断
最近泄露检测
某 agent 可见信息
某 fact 的传播路径
某 conversation 的 willingness 排序
```

---








### 3.9 `bridge/`

负责最少量接入原项目。

#### `promptBridge.ts`

把 GM perception 加进 prompt。

#### `conversationGuardBridge.ts`

在 NPC 消息生成后、写入前做 guard：

```text
generateMessage → gmGuard → writeMessage
```

#### `inputBridge.ts`

后续动作级 GM 使用，前期可以不做。

---

### 3.10 `willingness/`

负责对话发言意愿与发言顺序。

#### 核心思想

不要固定轮换发言，而是为每个参与者计算一个 willingness score：

```text
score 越高，越应该下一个说话。
```

#### 触发条件

willingness 不必每一句都重新算，只在“对话意愿发生变化”时触发：

```text
1. 对话第一轮
2. 新 agent 加入对话
3. 某 agent 被点名
4. 某 agent 获得新信息
5. 某 agent 被质疑 / 被请求回答
6. 场景阶段变化
7. GM 判断当前发言顺序需要重新评估
```

#### `willingnessTypes.ts`

定义：

```text
WillingnessScore
WillingnessContext
WillingnessReason
TurnOrderResult
```

#### `willingnessCalculator.ts`

根据以下因素计算得分：

```text
agent 是否被直接提问
agent 是否掌握相关信息
agent 当前目标是否要求发言
agent 性格是否外向 / 谨慎 / 沉默
agent 与当前话题的关系
agent 最近是否已经发言
agent 是否在场并能听见
agent 是否有强烈情绪或任务压力
```

示例：

```text
Bob 被 Alice 直接问到 → +40
Bob 知道相关事实 → +25
Bob 刚刚已经说过话 → -15
Bob 性格谨慎 → -5
Bob 当前目标是澄清误会 → +20
最终 score = 65
```

#### `turnOrderResolver.ts`

根据 score 排序：

```text
participants
→ willingness scores
→ sorted turn order
→ nextSpeaker
```

注意：

```text
不是固定 Alice → Bob → Charlie 轮换。
而是每次在关键节点根据意愿排序。
```

#### `willingnessTrigger.ts`

判断是否需要重算 willingness：

```text
isFirstRound
newParticipantJoined
speakerAskedQuestion
topicChanged
agentMentioned
newInformationRevealed
```

#### `willingnessDebug.ts`

记录：

```text
conversationId
participants
scores
ranking
reasonForEachScore
triggerReason
selectedNextSpeaker
```

---





































## 4. Schema / 数据表规划

### 4.1 `gmDebugLogs`

保存：

```text
worldId
agentId
conversationId / eventId
rawOutput
guardDecision
interventionLevel
reason
visibleFactsSummary
matchedHiddenFacts
regeneratedOutput
createdAt
```

### 4.2 `gmFacts`

保存：

```text
factId
content
visibility
sceneId
createdAt
```

### 4.3 `gmFactEdges`

保存：

```text
factId
fromAgentId / fromEventId
toAgentId
sourceType
evidence
createdAt
```

### 4.4 `gmRelationEdges`

保存：

```text
fromAgentId
toAgentId
interactionCount
lastInteractionAt
sharedEventIds
relationSummary
updatedAt
```

### 4.5 `gmWillingnessLogs`

保存：

```text
conversationId
triggerReason
participants
scores
ranking
selectedNextSpeaker
createdAt
```

---

## 5. Codex 执行任务清单

下面每个任务都可以单独交给 Codex 执行。

---

# Phase 0：先读文档，理解项目边界

## Task 0.1：阅读 docs 文件夹

### 目标

先不要写代码，只阅读文档，搞清楚项目结构。

### Codex 指令

```text
请先不要修改代码。阅读 docs/ 文件夹里的所有文档，重点关注：
1. 项目整体启动流程
2. convex/aiTown 的职责
3. convex/agent 的职责
4. convex/engine 的职责
5. 当前项目已有的 scene / visibility / debug 相关设计
然后输出一份项目结构总结，说明哪些模块已经负责坐标、移动、会话、记忆，哪些位置适合接入 GM。
```

### 验收标准

Codex 输出一份总结，至少包含：

```text
convex/aiTown/
convex/agent/
convex/engine/
convex/world.ts
src/components/SceneDebugPanel.tsx
docs/ai-town-interface-spec.md
docs/ai-town-file-map-zh.md
```

---

## Task 0.2：确认不要改哪些文件

### 目标

建立“禁止大改”的边界。

### Codex 指令

```text
请检查以下文件的职责，但不要修改它们：
- convex/aiTown/movement.ts
- convex/aiTown/worldMap.ts
- convex/aiTown/location.ts
- convex/engine/abstractGame.ts
- convex/aiTown/game.ts

请输出它们分别负责什么，并说明为什么 GM 不应该接管这些逻辑。
```

### 验收标准

输出：

```text
移动由 movement.ts 管
地图由 worldMap.ts 管
历史位置由 location.ts 管
engine step 由 abstractGame/game 管
GM 只读这些状态，不替代它们
```

---

# Phase 1：建立 GM 文件夹骨架

## Task 1.1：创建 GM 目录结构

### 目标

只创建空文件和 README，不写复杂逻辑。

### Codex 指令

```text
请在 convex/ 下新建 gm/ 文件夹，并创建以下目录和文件：

convex/gm/
├── README.md
├── index.ts
├── gmConfig.ts
├── gmTypes.ts
├── runtime/
├── spatial/
├── perception/
├── graph/
├── guard/
├── intervention/
├── tools/
├── debug/
├── bridge/
├── willingness/
└── tests/

每个子目录下先创建一个 README.md，简要说明该目录职责。
不要接入原业务逻辑。
```

### 验收标准

```text
项目可以正常 typecheck
没有修改原 movement/game/worldMap 等核心引擎文件
```

---

## Task 1.2：写 GM README

### 目标

把 GM 的边界写清楚，防止后面开发混乱。

### Codex 指令

```text
请完善 convex/gm/README.md，写清楚：
1. GM 是旁路监督层，不是新引擎
2. GM 只读原 AI Town 状态
3. 坐标和移动仍由原 engine 管
4. GM 只做语义空间、perception、信息图、关系图、guard、debug、willingness
5. 合理推理和性格化猜测属于 Level 0，不拦截
6. GM debug log 独立，不写入 agent memory
```

### 验收标准

README 能让新同学理解 GM 边界。

---

# Phase 2：GM 基础类型

## Task 2.1：定义 gmTypes.ts

### 目标

统一 GM 内部类型。

### Codex 指令

```text
请在 convex/gm/gmTypes.ts 中定义基础类型，不要依赖复杂业务逻辑。需要包含：

1. GMInterventionLevel = 0 | 1 | 2 | 3
2. GMGuardDecision:
   - pass
   - reasonable_inference
   - personality_based_guess
   - unsupported_but_harmless
   - possible_leakage
   - clear_leakage
   - physical_impossible
3. GMGuardResult
4. GMVisibleFact
5. GMSemanticLocation
6. GMObservation
7. GMRelationEdge
8. GMFactNode
9. GMFactEdge
10. GMWillingnessScore
11. GMTurnOrderResult
12. GMDebugRecord

请尽量保持类型轻量，方便后面 demo 迭代。
```

### 验收标准

```text
gmTypes.ts 可以被其他 GM 文件 import
没有引入循环依赖
```

---

# Phase 3：只读上下文加载

## Task 3.1：实现 gmContextLoader.ts

### 目标

GM 能读取原世界状态，但不修改。

### Codex 指令

```text
请在 convex/gm/runtime/gmContextLoader.ts 中实现只读上下文加载的骨架函数。

目标函数：
- loadGMContext(ctx, worldId)
- loadConversationContext(ctx, worldId, conversationId)
- loadAgentContext(ctx, worldId, agentId)

先不要做复杂查询，尽量复用当前已有 schema 和 query/helper。
如果无法确定某个表名，请先加 TODO 并保持函数可编译。
```

### 验收标准

```text
不会修改任何原状态
函数命名清楚
TODO 标明未知点
```

---

# Phase 4：语义空间树

## Task 4.1：实现 sceneGraph.ts

### 目标

建立 GM 自己的语义空间树。

### Codex 指令

```text
请在 convex/gm/spatial/sceneGraph.ts 中实现一个轻量 scene graph 结构，用于表示：
Scene → Zone/Room → Object → SubObject

先支持 demo 数据，不需要接数据库。
提供函数：
- createDemoSceneGraph()
- findNodeById()
- getChildren()
- getParent()
- getPathToRoot()
- describeNode()

示例节点：
MeetingRoom
CenterTable
Document_A
Chair_1
Door
Whiteboard
```

### 验收标准

```text
可以构造会议室 demo 树
可以查询 Document_A 的父节点是 CenterTable
可以输出 Document_A 在 MeetingRoom/CenterTable 下
```

---

## Task 4.2：实现 zoneResolver.ts

### 目标

把坐标解释成 zone。

### Codex 指令

```text
请在 convex/gm/spatial/zoneResolver.ts 中实现 demo 级坐标到 zone 的映射。

要求：
- 不修改原坐标系统
- 输入 x/y
- 输出 zoneId / roomId / confidence
- 支持 demo zone 的矩形范围判断
- 如果不在任何 zone，返回 unknown
```

### 验收标准

```text
给定 x/y，能返回 MeetingRoom / Cafe / unknown
```

---

## Task 4.3：实现 objectResolver.ts

### 目标

判断 agent 附近有哪些语义对象。

### Codex 指令

```text
请在 convex/gm/spatial/objectResolver.ts 中实现 demo 级 nearby object 判断。

输入：
- agent semantic location
- scene graph
- optional distance threshold

输出：
- nearbyObjects
- interactableObjects

先用 demo 数据实现，不需要接真实地图对象。
```

### 验收标准

```text
Alice 在 MeetingRoom near CenterTable 时，可以看到 Document_A / WaterBottle
```

---

## Task 4.4：实现 spatialSemantics.ts

### 目标

把 zoneResolver + sceneGraph + objectResolver 串起来。

### Codex 指令

```text
请在 convex/gm/spatial/spatialSemantics.ts 中实现：
- buildSemanticLocationForAgent()
- buildSpatialSummaryForAgent()

输出示例：
Alice is in MeetingRoom.
Alice is near CenterTable.
Document_A is on CenterTable.
Bob is near Alice.
```

### 验收标准

```text
输入 agent 坐标和 demo scene graph，可以输出语义空间摘要
```

---

# Phase 5：Perception 可见性

## Task 5.1：实现 visibilityResolver.ts

### 目标

判断谁能看到谁、看到什么事实。

### Codex 指令

```text
请在 convex/gm/perception/visibilityResolver.ts 中实现 demo 级可见性判断。

规则：
1. 同一 room 默认可见
2. 不同 room 默认不可见
3. public facts 所有人可见
4. private facts 只有 owner 可见
5. shared facts 只有 listed agents 可见
6. hidden facts 默认没人可见，除非 informationGraph 表明 knownBy

不要接入复杂遮挡，先留 TODO。
```

### 验收标准

```text
Alice 和 Bob 同房间互相可见
Charlie 不同房间不可见
hidden fact 不进入 Alice observation，除非 Alice knownBy
```

---

## Task 5.2：实现 audibleResolver.ts

### 目标

判断谁能听见发言。

### Codex 指令

```text
请在 convex/gm/perception/audibleResolver.ts 中实现 demo 级可听性规则：

1. 同一 conversation 的参与者可听
2. 同一 room 且非 whisper 的发言可听
3. whisper 只给 target
4. 不同 room 默认不可听
```

### 验收标准

```text
私聊不会被不相关 agent 听到
同房间公开说话可以被 nearby agent 听到
```

---

## Task 5.3：实现 observationBuilder.ts

### 目标

为每个 agent 生成专属观察文本。

### Codex 指令

```text
请在 convex/gm/perception/observationBuilder.ts 中实现：
- buildObservationText(agentId, perceptionContext)

输出包含：
1. 当前所在 room/zone
2. nearby agents
3. visible objects
4. visible facts
5. audible recent messages

注意：不要包含 hidden/private 未授权事实。
```

### 验收标准

```text
同一世界状态下 Alice 和 Bob 的 observation 可以不同
```

---

## Task 5.4：实现 perception.ts

### 目标

总入口。

### Codex 指令

```text
请在 convex/gm/perception/perception.ts 中实现：
- buildPerceptionForAgent()
- buildPerceptionsForConversation()

内部调用 spatialSemantics、visibilityResolver、audibleResolver、observationBuilder。
```

### 验收标准

```text
可以为一个 conversation 的所有参与者生成各自 observation
```








































---

# Phase 6：信息图与关系图

## Task 6.1：实现 graphUtils.ts

### 目标

先做通用图工具。

### Codex 指令

```text
请在 convex/gm/graph/graphUtils.ts 中实现轻量图工具：
- addDirectedEdge
- getOutgoingEdges
- getIncomingEdges
- findPath
- hasPath

先使用内存数组实现，demo 阶段不接数据库。
```

### 验收标准

```text
A→B→C 时，hasPath(A,C) 返回 true
```

---

## Task 6.2：实现 informationGraph.ts

### 目标

追踪谁知道什么。

### Codex 指令

```text
请在 convex/gm/graph/informationGraph.ts 中实现：
- addFact()
- markKnownBy()
- hasKnowledgePath()
- getKnownFacts(agentId)
- explainKnowledgePath(agentId, factId)

支持 fact visibility:
public/private/shared/hidden

重点：
只有 agent 有合法 known path 时，才算知道该 fact。
```

### 验收标准

```text
Bob 没有路径知道 F001，则 hasKnowledgePath(Bob,F001)=false
Alice 告诉 Bob 后，Bob 对 F001 有路径
```

---

## Task 6.3：实现 relationGraph.ts

### 目标

记录客观互动关系。

### Codex 指令

```text
请在 convex/gm/graph/relationGraph.ts 中实现：
- recordInteraction(fromAgentId, toAgentId, eventId)
- getRelationEdge(fromAgentId, toAgentId)
- summarizeRelation(fromAgentId, toAgentId)

只记录客观互动：
interactionCount
lastInteraction
sharedEvents
不要由 GM 主观生成 trust/suspicion。
```

### 验收标准

```text
Alice→Bob 和 Bob→Alice 是两条不同边
```

---

# Phase 7：GM Guard 输出审查

## Task 7.1：实现 leakageDetector.ts

### 目标

规则级检测明确泄露。

### Codex 指令

```text
请在 convex/gm/guard/leakageDetector.ts 中实现 demo 级泄露检测。

输入：
- output text
- hidden/private facts
- agent known facts

规则：
1. 如果 output 明确包含 hidden fact 的关键内容
2. 且 agent 没有 known path
3. 则标记 possible_leakage 或 clear_leakage

先用简单关键词/substring 方式实现，后续再接 LLM。
```

### 验收标准

```text
Bob 不知道 F001，却输出 F001 具体内容 → clear_leakage
Bob 只说 "I suspect someone is hiding something" → 不算泄露
```

---

## Task 7.2：实现 inferenceJudge.ts

### 目标

合理推理判定。

### Codex 指令

```text
请在 convex/gm/guard/inferenceJudge.ts 中实现合理推理判定的接口。

先做 demo 版本：
- 如果输出是 suspect / maybe / I think / I feel 等模糊猜测
- 且没有直接包含 hidden fact 具体内容
- 判为 reasonable_inference 或 personality_based_guess

请在注释中明确：
GM 不判断猜测是否真实，只判断 agent 是否有合理依据说出。
```

### 验收标准

```text
I suspect Alice may know something → Level 0
I know Charlie hid the key under the sofa → 不是 Level 0
```

---

## Task 7.3：实现 guardPrompt.ts

### 目标

准备未来接 GM LLM。

### Codex 指令

```text
请在 convex/gm/guard/guardPrompt.ts 中写一个 GM LLM 判断 prompt 模板。

必须包含：
1. 不要判断猜测是否真实
2. 只判断该 agent 是否有合理依据说出
3. 合理怀疑和性格化推理判 Level 0
4. 只有直接陈述无权限隐藏事实才判 leakage
5. 输出结构化 JSON
```

### 验收标准

prompt 清晰可复用。

---

## Task 7.4：实现 knowledgeGuard.ts

### 目标

整合 leakageDetector + inferenceJudge。

### Codex 指令

```text
请在 convex/gm/guard/knowledgeGuard.ts 中实现：
- judgeOutput(agentId, output, context)

逻辑：
1. 先检查 clear leakage
2. 再检查 reasonable inference
3. 再给出 GMGuardResult
4. 合理推理必须 Level 0
5. 明确泄露才 Level 1/3

暂时不调用真实 LLM，只用规则 demo。
```

### 验收标准

```text
合理猜测 → interventionLevel 0
明确隐藏事实泄露 → interventionLevel 1 或 3
```

---

# Phase 8：Intervention 介入策略

## Task 8.1：实现 intervention.ts

### 目标

根据 guard result 决定下一步。

### Codex 指令

```text
请在 convex/gm/intervention/intervention.ts 中实现：
- decideIntervention(guardResult)

规则：
Level 0: pass
Level 1: regenerate
Level 2: rewrite_demo
Level 3: reject_or_rollback
```

### 验收标准

每个 level 都有明确 action。

---

## Task 8.2：实现 regenerate.ts

### 目标

生成重新回答提示。

### Codex 指令

```text
请在 convex/gm/intervention/regenerate.ts 中实现：
- buildRegenerationPrompt(agentId, originalOutput, guardResult, visibleContext)

提示内容：
你刚才引用了当前角色无权知道的信息。
请只基于该角色的记忆、观察和公开信息重新回答。
```

### 验收标准

能生成用于重新调用 LLM 的 prompt 文本。

---

## Task 8.3：实现 rollbackPlan.ts

### 目标

不要一开始真回滚，先输出计划。

### Codex 指令

```text
请在 convex/gm/intervention/rollbackPlan.ts 中实现：
- buildRollbackPlan(guardResult)

输出：
shouldWriteMessage
shouldWriteMemory
shouldUpdateWorld
shouldWriteDebug
reason
```

### 验收标准

clear_leakage 时 shouldWriteMessage=false, shouldWriteMemory=false。

---






















































# Phase 9：Debug 日志

## Task 9.1：实现 debugTypes.ts

### 目标

定义 debug record。

### Codex 指令

```text
请在 convex/gm/debug/debugTypes.ts 中定义：
- GMDebugRecord
- GMGuardDebugRecord
- GMWillingnessDebugRecord
- GMSpatialDebugRecord
```

### 验收标准

能被 debugLog.ts 引用。

---

## Task 9.2：实现 debugLog.ts

### 目标

先做内存/console 版，后续再接数据库。

### Codex 指令

```text
请在 convex/gm/debug/debugLog.ts 中实现 demo 级 debug logger：
- recordGuardDebug()
- recordSpatialDebug()
- recordWillingnessDebug()

先可以 console.log 或返回 record，不强制写数据库。
注意不要写入 agent memory。
```

### 验收标准

GM 判断有单独 debug record。

---

# Phase 10：Willingness 发言意愿

## Task 10.1：实现 willingnessTypes.ts

### 目标

定义 willingness 类型。

### Codex 指令

```text
请在 convex/gm/willingness/willingnessTypes.ts 中定义：
- GMWillingnessScore
- GMWillingnessContext
- GMWillingnessFactor
- GMTurnOrderResult
- GMWillingnessTriggerReason

triggerReason 至少包含：
first_round
new_participant_joined
direct_question
agent_mentioned
new_information
topic_changed
manual_refresh
```

### 验收标准

类型能被 calculator 和 resolver 使用。

---

## Task 10.2：实现 willingnessTrigger.ts

### 目标

判断什么时候需要重算发言意愿。

### Codex 指令

```text
请在 convex/gm/willingness/willingnessTrigger.ts 中实现：
- shouldRecomputeWillingness(context)

规则：
1. 对话第一轮：true
2. 新 agent 加入：true
3. 有人被直接提问：true
4. 有人被点名：true
5. 新信息出现：true
6. topic changed：true
7. 否则默认 false

不要每一句都重算，避免过度干预。
```

### 验收标准

只有关键变化才触发重算。

---

## Task 10.3：实现 willingnessCalculator.ts

### 目标

给每个参与者计算发言意愿分。

### Codex 指令

```text
请在 convex/gm/willingness/willingnessCalculator.ts 中实现 demo 级 willingness score。

输入：
- conversation participants
- current speaker
- latest message
- agent profiles
- visible facts
- relation graph
- information graph

评分因素：
+40 被直接提问
+30 被点名
+25 掌握相关信息
+20 当前目标要求回应
+15 刚获得新信息
+10 性格外向
-10 性格谨慎/沉默
-15 刚刚已经发言
-30 不在场或听不到

输出每个 agent 的：
score
factors
reason
```

### 验收标准

被直接提问的人分数通常最高。
刚发言的人分数下降。
听不到对话的人分数很低或不可选。

---

## Task 10.4：实现 turnOrderResolver.ts

### 目标

根据 willingness 排序决定下一位说话者。

### Codex 指令

```text
请在 convex/gm/willingness/turnOrderResolver.ts 中实现：
- resolveTurnOrder(scores)
- selectNextSpeaker(scores)

规则：
1. 按 score 降序排序
2. 分数相同使用 tie-breaker：
   - 被直接提问优先
   - 更久没说话优先
   - agentId 稳定排序兜底
3. 返回 ranking 和 selectedNextSpeaker

不要固定轮换。
```

### 验收标准

输出稳定、可解释的发言顺序。

---

## Task 10.5：实现 willingnessDebug.ts

### 目标

记录 willingness 计算过程。

### Codex 指令

```text
请在 convex/gm/willingness/willingnessDebug.ts 中实现：
- buildWillingnessDebugRecord()

记录：
conversationId
triggerReason
participants
scores
ranking
selectedNextSpeaker
reasonForEachScore
```

### 验收标准

调试面板能展示为什么某 agent 下一个说话。

---

# Phase 11：Bridge 最小接入

## Task 11.1：实现 conversationGuardBridge.ts

### 目标

封装消息生成后的 GM guard。

### Codex 指令

```text
请在 convex/gm/bridge/conversationGuardBridge.ts 中实现：
- guardGeneratedMessage()

输入：
agentId
conversationId
rawOutput
gmContext

流程：
1. 调 knowledgeGuard
2. 调 intervention
3. 写 debug record
4. 返回：
   - shouldWrite
   - shouldRegenerate
   - finalOutput
   - debugRecord

暂时不要修改原 conversation.ts，只提供桥接函数。
```

### 验收标准

可被 conversation.ts 未来调用。

---

## Task 11.2：实现 promptBridge.ts

### 目标

把 GM observation 附加到 prompt。

### Codex 指令

```text
请在 convex/gm/bridge/promptBridge.ts 中实现：
- appendGMObservationToPrompt(systemPrompt, gmObservation)

要求：
1. 不改变原 prompt 主体
2. 只在末尾附加一个清晰的 GM Observation section
3. 不包含 hidden/private 未授权事实
```

### 验收标准

prompt 可读，不泄露 hidden facts。

---

## Task 11.3：设计接入 conversation.ts 的最小 patch

### 目标

先生成 patch 方案，不直接大改。

### Codex 指令

```text
请阅读 convex/agent/conversation.ts，找到 NPC 生成消息后、写入 messages 前的位置。
不要直接大改。
请输出最小 patch 方案：
1. 在哪里调用 conversationGuardBridge
2. 如何处理 shouldWrite=false
3. 如何触发 regenerate
4. 如何确保错误输出不进入 memories
```

### 验收标准

输出 patch plan，不破坏原逻辑。

---












































































# Phase 12：Debug UI

## Task 12.1：设计 GMDebugPanel

### 目标

先设计 UI，不急着全部接数据库。

### Codex 指令

```text
请查看 src/components/SceneDebugPanel.tsx 的结构。
设计一个新的 src/components/GMDebugPanel.tsx，用于展示：
1. 最近 GM guard 判断
2. 最近 willingness 排序
3. 当前 agent 可见信息
4. fact 传播路径
5. intervention level

先做静态 mock 数据版本，不接后端。
```

### 验收标准

页面能展示 mock GM debug 信息。

---

# Phase 13：工具动作反馈

## Task 13.1：实现 toolRegistry.ts

### 目标

定义工具类型。

### Codex 指令

```text
请在 convex/gm/tools/toolRegistry.ts 中定义 demo 工具注册表。

工具分三类：
1. real_tool
2. simulated_tool
3. narrative_only

示例：
send_email: real_tool 或 unavailable
check_notice_board: simulated_tool
tidy_table: narrative_only
```

### 验收标准

可以查询某动作对应工具类型。

---

## Task 13.2：实现 simulatedToolHandler.ts

### 目标

处理无真实 API 的模拟动作。

### Codex 指令

```text
请在 convex/gm/tools/simulatedToolHandler.ts 中实现：
- handleSimulatedToolAction(actionIntent)

支持：
check_notice_board
post_notice
sign_up
tidy_table

返回 toolOutcome。
```

### 验收标准

没有真实 API 时也能返回成功/失败/仅记录。

---

# Phase 14：测试

## Task 14.1：写 spatialSemantics 测试

### Codex 指令

```text
请为 convex/gm/spatial 写测试：
1. 坐标映射到 MeetingRoom
2. Alice 靠近 CenterTable
3. Document_A 位于 CenterTable 下
```

---

## Task 14.2：写 perception 测试

### Codex 指令

```text
请为 convex/gm/perception 写测试：
1. 同房间可见
2. 不同房间不可见
3. hidden fact 默认不可见
4. shared fact 只对指定 agent 可见
```

---

## Task 14.3：写 knowledgeGuard 测试

### Codex 指令

```text
请为 convex/gm/guard 写测试：
1. 合理怀疑 → Level 0
2. 性格化猜测 → Level 0
3. 明确说出无权限隐藏事实 → leakage
4. clear leakage 不应写入 memory
```

---

## Task 14.4：写 willingness 测试

### Codex 指令

```text
请为 convex/gm/willingness 写测试：
1. 第一轮触发 willingness
2. 新 agent 加入触发 willingness
3. 被直接提问的人分数最高
4. 刚发言的人分数下降
5. 按 score 排序选出 nextSpeaker
```

---

# Phase 15：整合 Demo 路线

## Demo 0：读文档，确认边界

只读 docs，输出模块地图。

## Demo 1：GM 空文件夹和 README

不接逻辑。

## Demo 2：语义空间树

坐标 → zone / room / object。

## Demo 3：Perception

每个 agent 获取不同 observation。

## Demo 4：信息传播图

谁知道什么、怎么知道。

## Demo 5：关系有向图

谁和谁互动过。

## Demo 6：Guard 旁路模式

只记录，不拦截。

## Demo 7：轻量介入

明确泄露才重生成。

## Demo 8：Willingness 发言排序

第一轮或新成员加入时重算发言顺序。

## Demo 9：工具结果反馈

真实工具 / 模拟工具 / 叙事动作。

## Demo 10：Debug UI

展示 GM 判断、willingness、可见事实、传播路径。

---

## 16. 最后用 1-5 点总结 GM 功能

1. **空间语义解释**  
   GM 不维护移动，只读取原坐标，把坐标解释成 zone / room / object，并用空间树组织房间、物品、可交互点。

2. **可见性与信息管理**  
   GM 为每个 agent 生成专属 observation，维护信息传播有向图，判断谁知道什么、通过什么路径知道。

3. **输出审查与介入**  
   GM 判断 agent 输出是合理推理还是信息泄露；合理推理 Level 0，只写 debug；明确泄露才重生成、改写或拒绝落库。

4. **关系图与工具反馈**  
   GM 维护 agent 客观关系有向图，记录互动和共享事件；同时处理真实工具、模拟工具和仅记录动作的结果反馈。

5. **Willingness 发言排序**  
   GM 在第一轮、新 agent 加入、被点名、话题变化等关键时刻计算每个 agent 的发言意愿得分，并按分数决定下一位说话者，而不是固定轮换。
