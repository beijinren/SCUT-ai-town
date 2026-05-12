# AI Town 全仓文件地图

这份文档的目标是两件事：

1. 解释整个项目是怎么被“驱动”起来的
2. 按文件逐个说明这个仓库里每个文件的作用

适合人群：

- 刚接手项目，想快速建立全局认识
- 想知道“某个功能应该改哪个文件”
- 想系统梳理 AI Town 的前端、后端、AI、地图、资源文件

阅读建议：

1. 先看“整体驱动逻辑”
2. 再看“文件清单”
3. 真正改代码时，再回到源码和前两份文档一起对照：
   - `docs/README-beginner-zh.md`
   - `docs/ai-town-interface-spec.md`

## 1. 整体驱动逻辑

## 1.1 系统启动主线

从冷启动开始，项目大致按下面顺序工作：

### 第一步：前端页面启动

- 浏览器加载 `index.html`
- Vite 入口是 `src/main.tsx`
- `src/main.tsx` 挂载 React 根组件
- `ConvexClientProvider` 建立前端到 Convex 的连接
- `App.tsx` 渲染主页和 `<Game />`

### 第二步：前端请求默认世界

- `src/components/Game.tsx` 调 `api.world.defaultWorldStatus`
- 拿到：
  - `worldId`
  - `engineId`
- 然后继续拉：
  - `api.world.worldState`
  - `api.world.gameDescriptions`

### 第三步：前端把后端数据还原为本地对象

- `src/hooks/serverGame.ts` 把序列化数据重新包装成：
  - `World`
  - `WorldMap`
  - `playerDescriptions`
  - `agentDescriptions`

这样前端组件就可以用面向对象的方式读世界状态。

### 第四步：后端初始化默认世界

首次运行时，`convex/init.ts` 会：

- 检查 LLM 配置是否合理
- 创建默认 world
- 创建默认 engine
- 把 `data/gentle.js` 里的地图塞进 `maps`
- 根据 `data/characters.ts` 创建默认 NPC
- 调度 `internal.aiTown.main.runStep`

### 第五步：游戏引擎开始跑 step

- `convex/aiTown/main.ts` 的 `runStep` 被调度执行
- `runStep` 会：
  - 从数据库加载世界状态
  - 建立 `Game` 实例
  - 在时间窗口内反复执行 `game.runStep`
  - 保存状态
  - 再调度下一次 `runStep`

这就是整个项目持续“活着”的核心循环。

## 1.2 用户行为是怎么驱动世界变化的

用户在前端点地图、点 NPC、发送消息时，不是直接改数据库，而是走“输入系统”。

### 输入系统流程

1. 前端通过 `useSendInput` 发起一个输入
2. `api.world.sendWorldInput` 把输入写入引擎输入队列
3. 引擎 step 里统一处理这个输入
4. 对应的 handler 修改世界状态
5. 前端订阅到新状态后自动刷新

这保证了：

- 世界状态只有一个统一入口修改
- 规则判断集中在引擎
- 前端不会绕开规则乱写数据

## 1.3 引擎 step 内部在做什么

每一轮 step 里，AI Town 主要做这几类事情：

### 1. 处理输入

例如：

- 玩家加入
- 玩家离开
- 玩家移动
- 发起聊天
- 接受/拒绝邀请
- 标记正在输入
- 完成发送消息

### 2. 推进移动系统

- 更新路径规划
- 推进人物位置
- 检查碰撞
- 必要时重新寻路

### 3. 推进会话系统

- 检查两人是否靠近到足够开始聊天
- 更新 typing 状态超时
- 控制聊天参与状态

### 4. 推进 agent 系统

- NPC 是否要做点什么
- NPC 是否要邀请别人聊天
- NPC 是否要回消息
- NPC 是否要结束对话
- NPC 是否要把结束的会话写入记忆

## 1.4 NPC 的驱动逻辑

当前 NPC 不是“LLM 全权控制的角色”，而是“规则引擎 + LLM 文本生成”的混合模式。

### 规则引擎负责

- 什么时候开始思考下一步
- 是否接受邀请
- 何时走向对方
- 何时开始发第一条消息
- 何时超时离开
- 活动/漫游的大方向

主要在：

- `convex/aiTown/agent.ts`
- `convex/aiTown/agentOperations.ts`

### LLM 负责

- 开场白
- 继续聊天的回复
- 离开前的告别
- 对话总结成记忆
- 给记忆打重要性分数
- 反思型记忆生成

主要在：

- `convex/agent/conversation.ts`
- `convex/agent/memory.ts`
- `convex/util/llm.ts`

## 1.5 NPC 说话时的完整链路

这是很多人最关心的一段。

### 情况一：NPC 需要开场说话

1. `convex/aiTown/agent.ts` 判断当前会话刚开始，且该 NPC 应先说话
2. 调度 `agentGenerateMessage`
3. `convex/aiTown/agentOperations.ts` 根据 `type = start` 选择 `startConversationMessage`
4. `convex/agent/conversation.ts`：
   - 取角色信息
   - 取对方信息
   - 取历史会话
   - 检索相关记忆
   - 拼 `system prompt`
5. `convex/util/llm.ts` 发 `chatCompletion`
6. 返回文本后写入 `messages`
7. 再通过输入系统回写“消息发送完成”

### 情况二：NPC 在继续对话

流程和上面类似，只是：

- 用 `continueConversationMessage`
- 会附带当前聊天历史
- 会限制“不要重新打招呼”

### 情况三：NPC 要离开

流程类似，只是：

- 用 `leaveConversationMessage`
- 目标是生成一条礼貌的结束语

## 1.6 会话结束后的记忆链路

1. 会话结束
2. `Agent` 把 `toRemember` 标记为当前 conversation
3. 后续 tick 中触发 `agentRememberConversation`
4. `convex/agent/memory.ts`：
   - 读取聊天记录
   - 让 LLM 从 NPC 自己视角总结这段对话
   - 计算 importance
   - 写入 memories 和 embeddings
5. 后续聊天时，这些记忆可以再次被检索出来，注入 prompt

## 1.7 定时任务驱动逻辑

`convex/crons.ts` 负责后台维护任务：

- 停止长期无人查看的世界
- 重启卡死的世界
- 定期清理过旧数据

这部分不会直接影响普通聊天体验，但会影响长期运行稳定性。

## 2. 文件清单

说明：

- 以下按目录分组
- 目标是给每个文件一句清楚的人话解释
- `node_modules/` 不在仓库主逻辑范围内，所以不列

## 2.1 根目录文件

- `README.md`
  - 原始项目说明，偏英文官方介绍、安装方式和自定义说明
- `ARCHITECTURE.md`
  - 官方架构总览，解释引擎层、AI 层、UI 层如何分工
- `LICENSE`
  - 开源许可证
- `package.json`
  - npm 脚本、依赖、开发依赖配置
- `package-lock.json`
  - 锁定依赖版本
- `tsconfig.json`
  - TypeScript 编译配置
- `vite.config.ts`
  - Vite 构建配置
- `tailwind.config.js`
  - Tailwind 配置
- `postcss.config.js`
  - PostCSS 配置
- `.eslintrc.js`
  - ESLint 规则
- `.eslintignore`
  - ESLint 忽略文件
- `.prettierrc`
  - Prettier 格式化配置
- `.gitignore`
  - Git 忽略规则
- `.dockerignore`
  - Docker 构建忽略规则
- `.vercelignore`
  - Vercel 忽略规则
- `vercel.json`
  - Vercel 部署配置
- `Dockerfile`
  - Docker 镜像构建定义
- `docker-compose.yml`
  - 本地组合启动前端、后端、dashboard 的配置
- `jest.config.ts`
  - Jest 测试配置
- `index.html`
  - Web 入口 HTML，Vite 会从这里挂载前端应用

## 2.2 `docs/`

- `docs/README.md`
  - 文档目录索引
- `docs/README-beginner-zh.md`
  - 新手友好的中文阅读手册
- `docs/ai-town-interface-spec.md`
  - 接口规范、变量管理、NPC 输出规则文档
- `docs/ai-town-file-map-zh.md`
  - 当前这份“全仓文件地图”

## 2.3 `convex/`

### 2.3.1 `convex/_generated/`

这些文件是 Convex 生成的，通常不手改。

- `convex/_generated/api.js`
  - 前后端调用 API 引用的 JS 版本
- `convex/_generated/api.d.ts`
  - API 的 TS 类型定义
- `convex/_generated/server.js`
  - 服务端辅助导出
- `convex/_generated/server.d.ts`
  - 服务端类型定义
- `convex/_generated/dataModel.d.ts`
  - 数据表和文档类型定义

### 2.3.2 `convex/` 根级业务文件

- `convex/schema.ts`
  - 总 schema 入口，组合 music、messages、agentTables、aiTownTables、engineTables
- `convex/init.ts`
  - 初始化默认世界、地图、NPC，并启动引擎
- `convex/world.ts`
  - 面向前端的世界相关 query/mutation，例如 worldState、joinWorld、leaveWorld、heartbeatWorld
- `convex/messages.ts`
  - 消息查询和消息写入
- `convex/music.ts`
  - 背景音乐相关逻辑，包含 Replicate 集成
- `convex/http.ts`
  - HTTP 路由入口
- `convex/crons.ts`
  - 定时任务定义：停掉闲置世界、重启死世界、清理旧数据
- `convex/constants.ts`
  - 集中放各种玩法、时序、超时、冷却、人数上限等常量
- `convex/testing.ts`
  - 调试和测试辅助接口，比如 stop / resume

### 2.3.3 `convex/aiTown/`

- `convex/aiTown/main.ts`
  - 引擎启动、kick、stop、`runStep` 调度总入口
- `convex/aiTown/game.ts`
  - `Game` 具体实现，负责加载世界、执行 step、保存状态
- `convex/aiTown/world.ts`
  - 世界对象定义与序列化
- `convex/aiTown/worldMap.ts`
  - 地图对象定义，描述瓦片、碰撞层、动画精灵
- `convex/aiTown/player.ts`
  - 玩家模型、移动与加入/离开输入
- `convex/aiTown/playerDescription.ts`
  - 玩家的人类可读描述信息，如名字、角色贴图、描述文本
- `convex/aiTown/conversation.ts`
  - 会话模型、邀请/接受/拒绝/离开/typing 状态输入
- `convex/aiTown/conversationMembership.ts`
  - 会话参与关系的数据结构
- `convex/aiTown/agent.ts`
  - NPC 在规则层里的“状态机”和 tick 逻辑
- `convex/aiTown/agentDescription.ts`
  - NPC identity / plan 描述对象
- `convex/aiTown/agentInputs.ts`
  - 代理异步操作结束后回写引擎的输入定义
- `convex/aiTown/agentOperations.ts`
  - 异步 agent action 入口，比如生成消息、记忆会话、决定做什么
- `convex/aiTown/inputs.ts`
  - 聚合 `playerInputs`、`conversationInputs`、`agentInputs`
- `convex/aiTown/inputHandler.ts`
  - 输入 handler 的通用包装器
- `convex/aiTown/insertInput.ts`
  - 把输入写进引擎队列表的辅助函数
- `convex/aiTown/location.ts`
  - 玩家位置的历史回放字段定义：`x/y/dx/dy/speed`
- `convex/aiTown/movement.ts`
  - 路径规划、碰撞检查、移动推进逻辑
- `convex/aiTown/ids.ts`
  - 游戏内部各种 ID 的类型与解析工具
- `convex/aiTown/schema.ts`
  - AI Town 游戏层的数据表定义

### 2.3.4 `convex/agent/`

- `convex/agent/schema.ts`
  - 记忆、embedding 等 agent 层表结构定义
- `convex/agent/conversation.ts`
  - NPC 对话 prompt 组装与文本生成核心
- `convex/agent/memory.ts`
  - 记忆总结、搜索、排序、importance 评分、reflection
- `convex/agent/embeddingsCache.ts`
  - embedding 缓存层，减少重复向量化开销

### 2.3.5 `convex/engine/`

- `convex/engine/schema.ts`
  - 引擎内部表结构
- `convex/engine/abstractGame.ts`
  - 通用引擎框架，AI Town 的 `Game` 基于它工作
- `convex/engine/historicalObject.ts`
  - 历史值记录器，用于平滑回放人物位置等连续数据
- `convex/engine/historicalObject.test.ts`
  - `historicalObject` 测试

### 2.3.6 `convex/util/`

- `convex/util/llm.ts`
  - LLM 统一网关，负责 provider 选择、chat completion、embedding、重试
- `convex/util/geometry.ts`
  - 几何和路径辅助函数，如距离、方向、路径压缩
- `convex/util/geometry.test.ts`
  - 几何工具测试
- `convex/util/types.ts`
  - Point、Vector、Path 等基础类型定义
- `convex/util/types.test.ts`
  - 基础类型工具测试
- `convex/util/object.ts`
  - Map 和对象序列化/反序列化辅助
- `convex/util/asyncMap.ts`
  - 异步 map 工具
- `convex/util/asyncMap.test.ts`
  - `asyncMap` 测试
- `convex/util/compression.ts`
  - 压缩辅助逻辑
- `convex/util/compression.test.ts`
  - 压缩工具测试
- `convex/util/minheap.ts`
  - 最小堆数据结构
- `convex/util/minheap.test.ts`
  - 最小堆测试
- `convex/util/assertNever.ts`
  - TS 穷尽分支辅助函数
- `convex/util/isSimpleObject.ts`
  - 判断对象是否是简单对象
- `convex/util/sleep.ts`
  - 异步 sleep
- `convex/util/xxhash.ts`
  - hash 工具
- `convex/util/FastIntegerCompression.ts`
  - 整数压缩实现

## 2.4 `src/`

### 2.4.1 `src/` 根文件

- `src/main.tsx`
  - React 入口，挂载 `ConvexClientProvider` 和 `App`
- `src/App.tsx`
  - 页面骨架、标题、帮助弹窗、底部按钮区
- `src/index.css`
  - 全局样式
- `src/toasts.ts`
  - toast 相关辅助
- `src/vite-env.d.ts`
  - Vite 环境类型声明

### 2.4.2 `src/hooks/`

- `src/hooks/sendInput.ts`
  - 统一封装向引擎发输入并等待结果
- `src/hooks/serverGame.ts`
  - 把后端 query 返回的世界数据组装成前端可用对象
- `src/hooks/useHistoricalTime.ts`
  - 协调历史回放时间轴
- `src/hooks/useHistoricalValue.ts`
  - 重放某个历史对象的值，比如角色位置
- `src/hooks/useWorldHeartbeat.ts`
  - 周期性发送 heartbeat 保活世界

### 2.4.3 `src/components/`

- `src/components/ConvexClientProvider.tsx`
  - 前端 Convex 客户端提供者
- `src/components/Game.tsx`
  - 游戏主容器，拉世界状态和右侧详情面板
- `src/components/PixiGame.tsx`
  - Pixi 主场景，把地图和角色真正画出来
- `src/components/PixiStaticMap.tsx`
  - 绘制静态地图和动画精灵
- `src/components/PixiViewport.tsx`
  - Pixi 视口封装
- `src/components/Character.tsx`
  - 单个角色精灵渲染
- `src/components/Player.tsx`
  - 玩家实体渲染与历史位置回放
- `src/components/PlayerDetails.tsx`
  - 右侧人物详情和聊天区逻辑
- `src/components/Messages.tsx`
  - 消息列表显示
- `src/components/MessageInput.tsx`
  - 消息输入框与发送逻辑
- `src/components/PositionIndicator.tsx`
  - 位置/选中提示
- `src/components/PoweredByConvex.tsx`
  - Convex 品牌展示
- `src/components/FreezeButton.tsx`
  - 停止/恢复世界运行的调试按钮
- `src/components/DebugPath.tsx`
  - 路径调试显示
- `src/components/DebugTimeManager.tsx`
  - 时间回放调试 UI

### 2.4.4 `src/components/buttons/`

- `src/components/buttons/Button.tsx`
  - 通用图标按钮
- `src/components/buttons/InteractButton.tsx`
  - 加入/离开游戏入口按钮
- `src/components/buttons/LoginButton.tsx`
  - 登录按钮，当前主要是预留
- `src/components/buttons/MusicButton.tsx`
  - 背景音乐控制按钮

## 2.5 `src/editor/`

这是地图编辑器相关文件，主要给地图制作和资源摆放用。

- `src/editor/README.md`
  - 编辑器使用说明
- `src/editor/index.html`
  - 编辑器入口页面
- `src/editor/le.html`
  - 某套 level editor 页面
- `src/editor/le.js`
  - 对应 level editor 主逻辑
- `src/editor/leconfig.js`
  - level editor 配置
- `src/editor/lecontext.js`
  - level editor 上下文对象
- `src/editor/lehtmlui.js`
  - level editor 的 DOM/UI 辅助
- `src/editor/se.html`
  - 另一套编辑器页面
- `src/editor/se.js`
  - 另一套编辑器主逻辑
- `src/editor/seconfig.js`
  - 另一套编辑器配置
- `src/editor/secontext.js`
  - 另一套编辑器上下文
- `src/editor/sehtmlui.js`
  - 另一套编辑器 UI 辅助
- `src/editor/eutils.js`
  - 编辑器工具函数
- `src/editor/mapfile.js`
  - 导出地图 JS 文件的逻辑
- `src/editor/spritefile.js`
  - sprite 相关处理
- `src/editor/undo.js`
  - 编辑器撤销逻辑
- `src/editor/campfire.json`
  - 编辑器动画资源定义
- `src/editor/gentlesparkle.json`
  - 编辑器动画资源定义
- `src/editor/gentlesplash.json`
  - 编辑器动画资源定义
- `src/editor/gentlewaterfall.json`
  - 编辑器动画资源定义
- `src/editor/windmill.json`
  - 编辑器动画资源定义

### `src/editor/maps/`

- `src/editor/maps/gentle.js`
  - gentle 地图的编辑器版本
- `src/editor/maps/gentleanim.js`
  - gentle 动画地图版本
- `src/editor/maps/gentle-full.js`
  - gentle 更完整版本
- `src/editor/maps/mage3.js`
  - 另一张示例地图
- `src/editor/maps/serene.js`
  - 另一张示例地图

### `src/editor/spritesheets/`

- `src/editor/spritesheets/campfire.png`
  - 篝火动画贴图
- `src/editor/spritesheets/doll.png`
  - 人物/装饰 sprite 贴图
- `src/editor/spritesheets/gentlesparkle32.png`
  - 闪光动画贴图
- `src/editor/spritesheets/gentlewaterfall32.png`
  - 瀑布动画贴图
- `src/editor/spritesheets/peeps.png`
  - 人物 sprite 贴图
- `src/editor/spritesheets/tall.png`
  - 高体型 sprite 贴图
- `src/editor/spritesheets/windmill.png`
  - 风车动画贴图
- `src/editor/spritesheets/women.png`
  - 人物 sprite 贴图

### `src/editor/tilesets/`

- `src/editor/tilesets/forest.png`
  - 森林 tileset
- `src/editor/tilesets/gentle.png`
  - gentle tileset
- `src/editor/tilesets/gentle-obj.png`
  - gentle 物体层 tileset
- `src/editor/tilesets/magecity.png`
  - mage city tileset
- `src/editor/tilesets/Modern.png`
  - 现代风 tileset
- `src/editor/tilesets/phantasy2.png`
  - fantasy 风格 tileset
- `src/editor/tilesets/Serene.png`
  - serene 风格 tileset

## 2.6 `data/`

- `data/characters.ts`
  - 默认 NPC 人设、角色外观、速度配置
- `data/gentle.js`
  - 默认地图数据
- `data/convertMap.js`
  - 把 Tiled JSON 转成项目可用地图 JS 的脚本

### `data/animations/`

- `data/animations/campfire.json`
  - 篝火动画描述
- `data/animations/gentlesparkle.json`
  - 闪光动画描述
- `data/animations/gentlesplash.json`
  - 水花动画描述
- `data/animations/gentlewaterfall.json`
  - 瀑布动画描述
- `data/animations/windmill.json`
  - 风车动画描述

### `data/spritesheets/`

- `data/spritesheets/f1.ts`
  - NPC 角色 f1 的 spritesheet 数据
- `data/spritesheets/f2.ts`
  - NPC 角色 f2 的 spritesheet 数据
- `data/spritesheets/f3.ts`
  - NPC 角色 f3 的 spritesheet 数据
- `data/spritesheets/f4.ts`
  - NPC 角色 f4 的 spritesheet 数据
- `data/spritesheets/f5.ts`
  - NPC 角色 f5 的 spritesheet 数据
- `data/spritesheets/f6.ts`
  - NPC 角色 f6 的 spritesheet 数据
- `data/spritesheets/f7.ts`
  - NPC 角色 f7 的 spritesheet 数据
- `data/spritesheets/f8.ts`
  - NPC 角色 f8 的 spritesheet 数据
- `data/spritesheets/p1.ts`
  - 另一类角色 spritesheet 数据
- `data/spritesheets/p2.ts`
  - 另一类角色 spritesheet 数据
- `data/spritesheets/p3.ts`
  - 另一类角色 spritesheet 数据
- `data/spritesheets/player.ts`
  - 玩家角色 spritesheet 数据
- `data/spritesheets/types.ts`
  - spritesheet 相关类型定义

## 2.7 `public/`

- `public/favicon.ico`
  - 网站 favicon

### `public/assets/`

- `public/assets/32x32folk.png`
  - 默认人物贴图集
- `public/assets/background.mp3`
  - 背景音乐资源
- `public/assets/gentle-obj.png`
  - 地图物体层贴图
- `public/assets/heart-empty.png`
  - UI 心形资源
- `public/assets/magecity.png`
  - 地图 tileset
- `public/assets/player.png`
  - 玩家资源图
- `public/assets/rpg-tileset.png`
  - RPG tileset
- `public/assets/tilemap.json`
  - 地图 tileset/图集描述

### `public/assets/fonts/`

- `public/assets/fonts/upheaval_pro.ttf`
  - 游戏 UI 字体
- `public/assets/fonts/vcr_osd_mono.ttf`
  - 像素风字体

### `public/assets/spritesheets/`

- `public/assets/spritesheets/campfire.png`
  - 篝火动画贴图
- `public/assets/spritesheets/gentlesparkle32.png`
  - 闪光动画贴图
- `public/assets/spritesheets/gentlewaterfall32.png`
  - 瀑布动画贴图
- `public/assets/spritesheets/windmill.png`
  - 风车动画贴图

## 2.8 `assets/`

这些主要是前端 UI 或宣传资源。

- `assets/a16z.png`
  - a16z logo
- `assets/background.webp`
  - 背景图资源
- `assets/close.svg`
  - 关闭图标
- `assets/convex.svg`
  - Convex logo
- `assets/convex-bg.webp`
  - Convex 风格背景图
- `assets/help.svg`
  - 帮助按钮图标
- `assets/interact.svg`
  - 互动按钮图标
- `assets/star.svg`
  - Star 按钮图标
- `assets/volume.svg`
  - 音量图标

### `assets/ui/`

- `assets/ui/box.svg`
  - UI 盒子底图
- `assets/ui/bubble-left.svg`
  - 左侧气泡 UI
- `assets/ui/bubble-right.svg`
  - 右侧气泡 UI
- `assets/ui/button.svg`
  - 按钮底图
- `assets/ui/button_pressed.svg`
  - 按下态按钮底图
- `assets/ui/chats.svg`
  - 聊天气泡/聊天面板图标
- `assets/ui/desc.svg`
  - 说明面板装饰图
- `assets/ui/frame.svg`
  - 边框装饰图
- `assets/ui/jewel_box.svg`
  - UI 装饰资源

## 2.9 `fly/`

- `fly/README.md`
  - Fly.io 部署说明
- `fly/backend/fly.toml`
  - Fly.io 后端部署配置
- `fly/dashboard/fly.toml`
  - Fly.io dashboard 部署配置

## 3. 建议你最先熟悉的 15 个文件

如果你不打算一次性记住全部文件，先抓下面这些最值钱：

- `src/main.tsx`
- `src/App.tsx`
- `src/components/Game.tsx`
- `src/hooks/sendInput.ts`
- `src/hooks/serverGame.ts`
- `convex/init.ts`
- `convex/world.ts`
- `convex/messages.ts`
- `convex/aiTown/main.ts`
- `convex/aiTown/game.ts`
- `convex/aiTown/inputs.ts`
- `convex/aiTown/player.ts`
- `convex/aiTown/conversation.ts`
- `convex/agent/conversation.ts`
- `convex/util/llm.ts`

## 4. 一句话总复盘

把整个项目压缩成一句话就是：

```text
前端负责展示和发动作，aiTown 负责规则和世界推进，agent 负责 NPC 的思考与记忆，llm.ts 负责真正接模型。
```

再补一句最重要的数据流口诀：

```text
初始化世界 -> 前端订阅世界 -> 用户/代理提交输入 -> 引擎 step 处理 -> 世界状态更新 -> 前端刷新 -> NPC 需要文本时再调用 LLM
```

如果你后续还想继续细化，我下一版可以再给你补一份：

- “按功能找文件”的导航版
- 比如“聊天相关改哪里 / 地图相关改哪里 / 移动相关改哪里 / prompt 相关改哪里”
