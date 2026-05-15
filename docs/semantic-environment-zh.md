# 空间语义感知与主动交互说明

这份文档解释本轮做了什么，以及它为什么是“真实接入主链路”，不是 GM 虚拟数据。

## 1. 这次解决什么问题

原来的 agent 主动交互主要看：

```text
谁离我近
我刚才有没有聊过
对方是不是空闲
当前场景氛围是否鼓励搭话
```

现在新增一层空间语义，让 agent 还可以理解：

```text
我在哪个区域
附近有什么物品
这些物品适合做什么
这个地点适不适合主动打扰别人
我是不是应该先走到某个物品或区域附近
```

## 2. 这不是 GM mock，而是真实地图数据

现在 `WorldMap` 增加了两个字段：

```ts
semanticObjects
semanticAreas
```

它们会跟地图一起进入真实的 `maps` 表。

也就是说真实链路是：

```text
convex/init.ts
-> maps 表
-> WorldMap
-> agentDoSomething
-> semanticEnvironment
-> interactionTiming
-> finishDoSomething
-> movePlayer / Conversation.start
```

所以 agent 的真实行动会被这套语义判断影响。

## 3. 临时语义数据放在哪里

临时数据没有直接塞进 `convex/init.ts`。

它被单独放在：

```text
data/semantic/crossMajorWorkshopSemantic.ts
```

`convex/init.ts` 只负责调用：

```ts
createDemoSemanticObjects(sceneId)
createDemoSemanticAreas(sceneId)
```

这样以后 Unity 导出正式语义数据时，只需要替换这个数据来源，不需要在主链路文件里到处删 demo 配置。

## 4. 新增的核心模块

新增：

```text
convex/aiTown/semanticEnvironment.ts
```

它负责三件事：

```text
1. getEnvironmentContextForPlayer()
   根据玩家坐标识别当前区域、附近物品、附近人物和环境提示。

2. buildInteractionCandidates()
   根据环境上下文生成候选行为。

3. selectReachablePointNearObject() / selectReachablePointInArea()
   给 move_to_object / move_to_area 选择可达点，避免走进阻挡格。
```

它不负责：

```text
不移动角色
不发起对话
不调用 LLM
不生成坐标幻想
```

## 5. 主链路怎么使用它

真实 agent 空闲时会触发：

```text
Agent.tick()
-> agentDoSomething
```

现在 `agentDoSomething` 会额外做：

```text
1. 读取真实 WorldMap.semanticObjects / semanticAreas
2. 计算 EnvironmentContext
3. 生成 SemanticActionCandidate
4. 交给 decideInteractionTiming()
5. 根据最终选择执行原系统动作
```

动作仍然复用旧系统：

```text
approach_player -> Conversation.start
move_to_object -> movePlayer
move_to_area -> movePlayer
wait -> 不移动、不邀请
```

## 6. GM 怎么复用

GM 原来有：

```text
convex/GM/spatial/
```

现在 `gmContextLoader` 会从真实 `worldMap.semanticAreas / semanticObjects` 生成：

```text
GMZone
GMSceneObject
```

所以 GM spatial 后续看到的不是固定 demo zone，而是真实地图语义数据。

简单说：

```text
主链路用同一份语义数据做行动决策。
GM 用同一份语义数据做旁路解释和 observation。
```

## 7. 调试面板能看到什么

`SceneDebugPanel` 现在会显示：

```text
当前区域
附近物品
附近人物
环境提示
候选行为
候选行为分数
候选行为理由
最终语义选择
是否由空间语义触发
```

这能解释 agent 为什么：

```text
走向饮料桌
靠近某个人
移动到发布台附近
选择等待
```

## 8. 当前临时语义对象

目前为了先跑通识别判断，临时加入：

```text
休息区
发布台附近
安静角落
饮料桌
沙发
发布台
安静角落展示板
```

这些数据只是早期替代 Unity 导出，格式会和未来正式字段保持一致。

## 9. 最短总结

```text
语义数据进真实 maps 表。
主链路真实读取它。
agentDoSomething 真实调用它。
interactionTiming 真实用它改变决策。
GM 也从同一份数据读取空间语义。
临时数据单独放 data/semantic，后面好替换。
```
