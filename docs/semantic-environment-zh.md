# 空间语义感知与主链路接入说明

这份文档用小白友好的方式说明：我们现在做了什么、真实地图放在哪里、主链路怎么用它、GM 怎么复用它。

## 1. 一句话说明

现在不是 GM 自己造一份“假空间数据”，而是把真实地图 JSON 里的语义区域和语义物品写入 `maps` 表。

主链路和 GM 都读同一份数据：

```text
data/maps/interview_room/interview_room.json
-> data/maps/interview_room/interviewRoomMap.ts
-> convex/init.ts
-> maps 表
-> WorldMap.semanticAreas / semanticObjects
```

## 2. 地图文件放在哪里

真实地图包放在：

```text
data/maps/interview_room/
```

里面有：

```text
interview_room.json      地图导出的原始 JSON
tileset.png              地图 tileset 源文件
reference.jpg            参考图，给人看的
interviewRoomMap.ts      把 JSON 转成 AI Town 原地图格式
README.md                地图包说明
```

浏览器真正加载 tileset 时，需要从 `public/` 读取，所以还有一份：

```text
public/maps/interview_room/tileset.png
```

## 3. 为什么要有 interviewRoomMap.ts

AI Town 原来的地图格式类似：

```text
data/gentle.js
-> bgtiles
-> objmap
-> tilesetpath
-> mapwidth / mapheight
```

你给的新地图是 JSON，结构更丰富：

```text
bgLayers
visualLayers
collisionLayers
zones
objects
markers
```

所以我们加了一个适配器：

```text
data/maps/interview_room/interviewRoomMap.ts
```

它做三件事：

```text
1. 把 JSON 图层转成 AI Town 能读的 bgtiles / objmap
2. 把 zones 转成 semanticAreas
3. 把 objects 转成 semanticObjects
```

注意：它只是“翻译格式”，不是新引擎。

## 4. 主链路现在怎么跑

主链路特点仍然不变：

```text
world 还是脚本生成
agent 还是脚本生成
UI 还是只读状态并显示
movement / pathfinding / collision 仍然用原系统
```

现在 `convex/init.ts` 不再直接读 `data/gentle.js`，而是读：

```text
data/maps/interview_room/interviewRoomMap.ts
```

然后写入：

```text
maps.bgTiles
maps.objectTiles
maps.semanticAreas
maps.semanticObjects
```

这样 agent 的真实行动循环就能拿到语义地图。

## 5. 语义判断模块做什么

新增核心文件：

```text
convex/aiTown/semanticEnvironment.ts
```

它负责识别和打分，不负责移动。

主要函数：

```text
getEnvironmentContextForPlayer()
```

根据 agent 当前坐标，判断：

```text
它在哪个区域
附近有什么物品
附近有什么人
这个环境有什么提示
```

```text
buildInteractionCandidates()
```

根据环境生成候选行为：

```text
approach_player   靠近某个人
move_to_object    走到某个物品附近
move_to_area      走到某个区域
wait              等待
```

每个候选行为都有：

```text
score
reasons
destination（如果需要移动）
```

## 6. interactionTiming 怎么用它

原来的主动交互判断主要看：

```text
距离
冷却时间
对方是否空闲
场景是否鼓励主动交流
```

现在在这些规则上额外加空间语义：

```text
当前区域是否适合交流
附近物品是否提供自然开场理由
附近是否有低压力互动点
目标是否正在忙
是否更适合先移动到某个物品或区域
```

但最终动作还是交给原系统执行：

```text
approach_player -> 原来的发起会话逻辑
move_to_object  -> 原来的移动逻辑
move_to_area    -> 原来的移动逻辑
wait            -> 不移动，不发起对话
```

## 7. GM 怎么复用

GM 侧原来已经有：

```text
convex/GM/spatial/
```

现在 `gmContextLoader` 会从真实 `WorldMap` 读取：

```text
semanticAreas
semanticObjects
```

并转换成 GM 内部的：

```text
GMZone
GMSceneObject
```

所以 GM 后续做 observation / perception / debug 时，看到的是同一份真实地图语义，不是另一套 mock。

## 8. 调试面板能看到什么

`SceneDebugPanel` 现在会显示主动交互决策里的空间语义信息：

```text
当前区域
附近物品
附近人物
环境提示
候选行为
候选行为分数
候选行为理由
最终选择
是否由空间语义触发
```

这样你可以直接看出：

```text
为什么 agent 走向会议桌
为什么 agent 靠近某个人
为什么 agent 选择等待
为什么某个物品改变了行为倾向
```

## 9. 当前最重要的边界

这次没有做：

```text
不让 LLM 直接输出坐标
不重写 movement
不重写 collision
不重写 pathfinding
不让 GM 接管主链路
不把语义数据散落写进 init.ts
```

这次做的是：

```text
真实地图 JSON 进入独立地图包
地图适配器把 JSON 转成 AI Town 可读格式
WorldMap 保存 semanticAreas / semanticObjects
主链路根据语义生成候选行为
GM 读取同一份真实语义数据做旁路解释
```

## 10. 最短总结

```text
地图库管地图。
WorldMap 管真实地图状态。
semanticEnvironment 管识别和候选行为评分。
interactionTiming 管是否采用语义行为。
agentOperations 管把选择交给原移动/对话系统执行。
GM 只读同一份语义数据做解释和 debug。
```
