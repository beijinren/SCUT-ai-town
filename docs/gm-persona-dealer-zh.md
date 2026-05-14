# GM Persona 发牌器与统一场景库说明

这份文档给第一次看这个模块的同学用。核心思想很简单：

```text
场景库管世界和身份。
persona 库管性格风格。
发牌器只负责把 persona 发给已有 identity。
主链路仍然用脚本生成 world 和 agent。
UI 仍然只读取后端状态并展示。
```

## 1. 原项目主链路原来怎么跑

原 AI Town 的主链路大概是这样：

```text
data/scenes/*.ts
  -> buildSceneProtocol()
  -> convex/init.ts
  -> 创建 world
  -> createAgent input
  -> 创建 agent
  -> 写入 playerDescriptions / agentDescriptions
  -> UI 读取 world 状态并显示
```

换成人话就是：

```text
场景文件先写好“这个世界是什么、有哪些角色、角色身份和目标是什么”。
init 脚本创建这个世界。
createAgent 脚本把角色一个个放进世界。
UI 不生成世界，也不生成 agent，只负责把后端状态画出来。
```

这个特点现在不变：

```text
world 仍然是脚本生成。
agent 仍然是脚本生成。
UI 仍然独立，只负责显示。
```

## 2. 为什么要统一场景库

如果主链路继续读旧的 `data/scenes/*.ts`，而发牌器读新的 `scenario_config.json`，就会出现一个危险问题：

```text
agent 是从旧模板生成的，
persona 是按新模板发的，
两边的人可能对不上。
```

所以现在改成：

```text
data/scenarios/<sceneId>/scenario_config.json
  同时作为主链路和 Persona 发牌器的共同输入。
```

当前标准场景模板放在：

```text
data/scenarios/cross_major_creative_workshop_ai_town/scenario_config.json
```

旧的 `data/scenes/*.ts` 暂时保留，作为 legacy fallback，不在本轮删除。

## 3. 新增的统一场景适配层

新增文件：

```text
convex/GM/setup/scenarioConfigAdapter.ts
```

它的作用是：

```text
读取 scenario_config.json
把 JSON 场景转换成原项目已有的 StructuredScene
让 buildSceneProtocol() 继续正常生成 worldSeed 和 agentSeeds
```

它不做这些事：

```text
不修改 scenario_config.json
不生成新的 agent goal
不调用 LLM
不分配 persona
不介入对话
```

它只是一个“翻译器”：

```text
JSON 场景模板 -> StructuredScene
```

## 4. Persona 发牌器现在做什么

Persona 发牌器在：

```text
convex/GM/setup/
```

核心文件：

```text
setupTypes.ts
personaLoader.ts
scenarioPersonaDealer.ts
scenarioConfigAdapter.ts
personaAssigner.ts
assignmentHistory.ts
runId.ts
```

它只做一件事：

```text
给场景里已经存在的 identity 分配 persona。
```

输出长这样：

```ts
{
  runId,
  sceneId,
  strategy,
  assignmentKey,
  assignments,
  createdAt
}
```

其中 `assignments` 只有：

```text
agentId
identitySlotId
displayName
personaId
```

它不会输出：

```text
agentGoal
privateContext
publicProfile
initialKnowledge
```

这点很重要。因为这些字段属于场景模板或 agent 自己的初始化逻辑，不属于发牌器。

## 5. 主链路和发牌器怎么对齐

关键靠同一个编号：

```text
identitySlotId
```

现在规则是：

```text
scenario_config.json 里的 agents
  -> extractIdentitySlotRefs()
  -> identitySlotId

scenario_config.json 里的 agents
  -> scenarioConfigAdapter
  -> StructuredScene.roles[].id

StructuredScene.roles[].id
  -> buildSceneProtocol()
  -> agentSeeds[].roleId
```

所以这三个值是同一个东西：

```text
PersonaAssignment.identitySlotId
StructuredScene.roles[].id
SceneAgentSeed.roleId
```

举例：

```text
Lin Yuan
  -> identitySlotId = slot_0_lin_yuan
  -> role.id = slot_0_lin_yuan
  -> agentSeed.roleId = slot_0_lin_yuan
  -> persona assignment 也用 slot_0_lin_yuan
```

这样 createAgent 初始化 agent 时，后续只需要拿 `agentSeed.roleId` 去查 persona assignment：

```text
agentSeed.roleId === assignment.identitySlotId
```

查到了，就知道这个 agent 对应哪个 `personaId`。

## 6. “不把 persona 直接揉进 identity / plan”是什么意思

不要这样做：

```text
identity = 原 identity + persona 描述
plan = 原 plan + persona 修饰
```

原因是以后很难拆。

如果 persona 被直接拼进 identity 或 plan，后面会分不清：

```text
哪些是场景身份？
哪些是 agent 原本目标？
哪些是 persona 性格？
```

更好的方式是单独存：

```text
agentSeed.roleId = slot_0_lin_yuan
assignment.identitySlotId = slot_0_lin_yuan
assignment.personaId = cautious_observer
```

后续 prompt 或初始化逻辑想使用 persona 时，再根据 `personaId` 去 `data/personas/` 读取 persona 内容。

也就是说：

```text
identity 还是 identity。
plan 还是 plan。
persona 是旁边单独挂的一张牌。
```

这样最解耦，也最好改。

## 7. 当前默认场景怎么切换

现在 `data/scenes/index.ts` 做了一个很小的桥接：

```text
读取 data/scenarios/cross_major_creative_workshop_ai_town/scenario_config.json
调用 scenarioConfigToStructuredScene()
生成 crossMajorCreativeWorkshopTemplate
把 defaultSceneTemplate 指向这个 JSON 场景
```

所以 `convex/init.ts` 不需要大改。

原来的初始化方式还是：

```text
convex/init.ts
  -> defaultSceneProtocol.worldSeed
  -> defaultSceneAgentDescriptions
```

只是 `defaultSceneProtocol` 的来源，从旧 TS 场景切到了统一 JSON 场景库。

## 8. Persona 库在哪里

Persona 库在：

```text
data/personas/
```

这里保存的是性格和表达风格，不保存 goal，不保存 identity，不保存 willingness 规则。

第一版不要求补齐固定 8 个 persona。只要有足够测试发牌的 persona 就可以。

## 9. 组合去重怎么做

发牌器会把一轮分配变成一个组合号：

```text
assignmentKey
```

格式类似：

```text
slot_0_lin_yuan:cautious_observer|slot_1_meng_zhou:rational_analyst
```

同一个 scene 下，如果这个完整组合出现过，默认不能再出现。

历史记录约定放在：

```text
GMPersonaAssignmentHistory/<sceneId>/assignment_history.json
```

当前核心逻辑是纯函数，不直接读写文件。以后可以在外层脚本里负责读 JSON、调用发牌器、再写回 JSON。

## 10. 信息传播图目录约定

后续信息传播图可以按这个结构保存：

```text
gm-graph-runs/<sceneId>/<runId>/round_<n>/information_graph.json
```

本轮没有改现有 information graph runtime，只是把落盘目录规范先定下来。

## 11. 文件功能速查

```text
data/scenarios/
  统一场景模板库。

data/scenarios/cross_major_creative_workshop_ai_town/scenario_config.json
  当前标准场景模板。

data/personas/
  persona 库。

data/scenes/index.ts
  原主链路入口之一。现在把默认场景切到统一 JSON 场景。

convex/GM/setup/scenarioConfigAdapter.ts
  把 scenario_config.json 转成 StructuredScene。

convex/GM/setup/scenarioPersonaDealer.ts
  从同一个 scenario_config.json 提取 identitySlotId / agentId / displayName。

convex/GM/setup/personaAssigner.ts
  执行 random-unused 或 fixed 发牌。

convex/GM/setup/assignmentHistory.ts
  生成 assignmentKey，并记录组合是否用过。

convex/GM/setup/personaLoader.ts
  校验 persona 模板，防止 persona 里混入 goal / identity / willingness。

convex/GM/tests/scenarioConfigAdapter.test.ts
  测试 JSON 场景能转成 StructuredScene，并且 roleId 能和发牌器对齐。

convex/GM/tests/personaDealer.test.ts
  测试发牌、去重、fixed 分配，以及不生成 goal/profile 字段。
```

## 12. 最短总结

```text
主链路仍然生成 world 和 agent。
UI 仍然独立显示。
统一场景库现在是主链路和发牌器的共同输入。
发牌器只输出 identitySlotId -> personaId。
agent 初始化后续用 roleId 匹配 identitySlotId。
persona 不直接揉进 identity / plan，而是作为独立 assignment 保留。
```
