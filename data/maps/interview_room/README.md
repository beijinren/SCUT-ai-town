# Interview Room 地图包

这个文件夹保存 `interview_room` 的真实地图导出数据，而不是 GM 临时模拟数据。

- `interview_room.json`：地图结构、碰撞层、视觉层、语义区域和语义物品。
- `tileset.png`：地图 tileset 源文件。
- `reference.jpg`：参考图，只用于人工查看。
- `interviewRoomMap.ts`：把 JSON 转成 AI Town 原主链路可以读取的地图格式。

关键约定：

- 主链路仍然通过 `convex/init.ts` 写入 `maps` 表。
- `bgTiles` 用于显示，包含背景层和视觉层。
- `objectTiles` 只放碰撞层，避免装饰物把角色误挡住。
- `semanticAreas / semanticObjects` 来自真实 JSON，供主链路语义判断和 GM 空间感知共同使用。
