# 在原始 a16z AI Town 基础上，我们现在到底做了什么

## 一句话总结

我做的事情，用最简单的话说就是：

> 把原来那个“能跑的 demo”，改成了一个**更适合后续做实验**的 AI Town 版本。

具体体现在 4 个大方向：

1. 让它在本地更容易跑、更容易重置、更容易继续开发。
2. 把默认角色和默认场景，从原始固定内容，改成了我们自己可切换的模板。
3. 加了一套“能直接看见系统内部状态”的调试面板。
4. 把原来写死在主流程里的部分聊天/交互逻辑，先拆开，方便后面继续做实验。

这份文档下面就按 **增 / 删 / 改 / 查** 来写。

---

## 增：新增了什么

## 1. 新增了场景模板体系

新增文件：

- `data/scenes/index.ts`
- `data/scenes/pressConference.ts`
- `data/scenes/casualCommonArea.ts`

人话解释：

- 原始 a16z 版本里，默认角色和默认环境更像是写死的 demo 内容。
- 现在我加了一层“场景模板”。
- 也就是说，默认世界不再只能靠原始那套角色启动，而是可以从一个模板里生成。

当前已经做出来的模板有两个：

1. `企业危机发布会`
2. `午后公共休息区`

其中现在默认跑的是：

- `午后公共休息区`

当前默认角色是：

- 实习生
- 设计师
- 工程师
- 社区运营

---

## 2. 新增了场景结构定义

新增文件：

- `convex/aiTown/sceneTypes.ts`
- `convex/aiTown/sceneProtocol.ts`
- `convex/aiTown/sceneVisibility.ts`
- `convex/aiTown/sceneProtocol.test.ts`
- `convex/aiTown/sceneVisibility.test.ts`

人话解释：

- 我把“场景里到底有哪些信息”整理成了一套明确结构。
- 不再只是几段介绍文字。

现在这套结构里至少包括：

- 场景基本信息
- 角色
- 事实信息
- 信息可见性
- 场景阶段

最重要的是，我把信息分成了 4 类：

- `public`：所有人都知道
- `private`：只有自己知道
- `shared`：少数几个人知道
- `hidden`：系统里存在，但当前没人直接知道

这一步的意义是：

> 后面如果要研究“谁什么时候应该开口”，至少要先知道“谁知道什么”。

---

## 3. 新增了场景调试面板

新增文件：

- `src/components/SceneDebugPanel.tsx`

并接入：

- `src/components/Game.tsx`

人话解释：

- 原始 a16z 版本里，你看页面时，更多只能看到角色在动、在说话。
- 现在我在右侧加了一个新的调试面板。

这个面板现在能直接显示：

- 当前场景是什么
- 当前场景阶段是什么
- 当前有哪些隐藏信息
- 每个角色当前知道什么
- 每个角色当前有哪些权限
- 最近一次为什么主动接触、或者为什么没接触

所以它的作用不是“更好看”，而是：

> 让人能直接看见系统内部到底在发生什么。

---

## 4. 新增了主动交互决策层

新增文件：

- `convex/aiTown/interactionTiming.ts`
- `convex/aiTown/interactionTiming.test.ts`

人话解释：

- 原始版本里，agent 什么时候主动找人说话，很多逻辑是散着的。
- 我先抽了一层出来，专门管“现在值不值得主动接触别人”。

当前这层会参考一些最基础的因素，比如：

- 距离远近
- 对方忙不忙
- 场景氛围
- 刚刚是不是才聊完

注意：

- 这还不是最终研究成果
- 它现在更像一个“方便后续继续做实验的入口”

---

## 5. 新增了会话规则接口层

新增文件：

- `convex/aiTown/conversationRules.ts`
- `convex/aiTown/defaultConversationRules.ts`
- `convex/aiTown/defaultConversationRules.test.ts`
- `convex/aiTown/conversationDecisionContext.ts`

人话解释：

- 原始版本里，谁先说、什么时候继续说、什么时候结束对话，很多东西是直接写在主逻辑里的。
- 我把这部分先抽成了“规则层”和“默认实现层”。

现在的状态是：

- 当前仍然主要是双人会话
- 但会话怎么开始、谁什么时候说，已经不再完全写死在原始流程里

这一步的意义空当前世界是：

> 后面如果要继续做“打断 / 连续说 / 沉默听 / 记忆影响发言”这些实验，不需要从一坨旧逻辑里硬拆。

---

## 6. 新增了开发辅助能力

新增文件：

- `convex/aiTown/demoMode.ts`
- `convex/tsconfig.json`
- `convex/README.md`
- `.gitignore`

以及新增功能：

- `convex/testing.ts` 里的 `hardResetWorldState`

人话解释：

- `demoMode.ts`：开发时可以临时关掉一部分 agent 自动行为，方便只看结构，不被动态结果干扰。
- `hardResetWorldState`：一键同步清，避免旧数据残留。
- 其余文件主要是为了让当前这条分支更容易继续开发和维护。

---

## 改：修改了什么

## 1. 改了 world 初始化方式

修改文件：

- `convex/init.ts`

人话解释：

- 原来初始化更接近“按原始默认内容启动”
- 现在改成了“按默认场景模板启动”

当前 world 初始化时会：

- 写入当前场景状态
- 按默认模板创建角色

这一步意味着：

> 场景模板不再只是文档，而是真的进入了运行时。

---

## 2. 改了 agent 创建方式

修改文件：

- `convex/aiTown/agentInputs.ts`
- `convex/aiTown/agentDescription.ts`

人话解释：

- 原来 agent 的描述更像原始固定角色数据。
- 现在 agent 的输入，来自当前选中的场景模板。

另外我还改了一件很关键的事：

- 把“角色自己知道的内容”和“别人能看到的公开简介”分开了。

现在拆成：

- `identity`：角色自己用
- `publicProfile`：别人看见的版本

这么改是为了减少信息泄漏。

---

## 3. 改了会话生成时喂给 LLM 的内容

修改文件：

- `convex/agent/conversation.ts`

人话解释：

- 原来在生成对话时，当前角色会直接拿到“对方角色自己的完整身份上下文”。
- 这个做法会导致不该知道的私有信息也被喂给模型。

现在我先修成：

- 当前角色仍然拿到自己的完整上下文
- 但对于对方，只给“公开简介”

这是当前已经改掉的一个明确问题。

---

## 4. 改了世界结构

修改文件：

- `convex/aiTown/world.ts`
- `convex/world.ts`

人话解释：

- world 现在会保存 `sceneState`
- 前端也可以单独查这个 `sceneState`

所以现在世界里不只是玩家、agent、会话这些东西，还会记住：

- 当前场景是什么
- 当前场景有哪些角色名
- 当前有哪些公开/隐藏事实 ID

---

## 5. 改了 agent 的主行为流程

修改文件：

- `convex/aiTown/agent.ts`
- `convex/aiTown/agentOperations.ts`

人话解释：

- 原始版本里，agent 的很多行为是直接塞在主流程里的。
- 我这里动了两块：

1. 主动找人聊天这件事，开始走单独的决策层
2. 进入会话后，发言机会判断开始走单独规则层

另外还加了一个记录：

- `lastInteractionDecision`

它用来保存：

- 最近一次为什么主动接触
- 或为什么没接触

---

## 6. 改了 LLM 接口接法

修改文件：

- `convex/util/llm.ts`

人话解释：

- 原始版本更偏向“聊天模型和 embedding 模型绑在一起”
- 我这里改成了“可以拆开配置”

这样做的原因很简单：

- 聊天模型不一定和 embedding 模型是同一家
- 如果强绑死，后续很难调

所以现在这条分支支持：

- chat 单独配
- embedding 单独配

---

## 查：新增了哪些“看状态/查状态”的能力

这部分其实也很重要，因为你现在问“到底改了什么”，很多东西就是通过这些查询看出来的。

## 1. 新增 / 改造了场景状态查询

相关文件：

- `convex/world.ts`

现在可以查：

- 当前 world 的 `sceneState`
- 当前默认模板对应的角色视图
- 当前 agent 最近一次主动交互决策

人话解释：

- 以前很多东西在系统里发生了，但外面看不见。
- 现在这些东西至少可以被查出来、展示出来。

---

## 2. 新增了“场景调试面板”这类观察出口

相关文件：

- `src/components/SceneDebugPanel.tsx`

它现在能让你直接在页面里看：

- 场景信息
- 隐藏信息
- 每个角色当前能看见什么
- 每个角色当前权限
- 最近一次交互决策

也就是说，当前不只是“系统在跑”，而是“系统内部状态可以被人直接观察”。

---

## 删：删除了什么

## 1. 没有做大的永久删除

这条分支当前**没有做大规模删除原始 a16z 功能**。

更准确地说：

- 我做的是“新增 + 改接入方式”
- 不是把原始系统大块删掉重写

所以你可以把当前理解成：

> 在原始 a16z AI Town 上面叠加了一层更适合实验的结构，而不是推翻重来。

---

## 自动生成文件为什么也变了

修改文件：

- `convex/_generated/api.d.ts`
- `convex/_generated/api.js`
- `convex/_generated/dataModel.d.ts`
- `convex/_generated/server.d.ts`
- `convex/_generated/server.js`

人话解释：

- 这些不是我手写的新功能
- 它们是 Convex 根据当前函数和数据结构自动生成的文件

所以它们变化的原因是：

- 前面的 `convex/*.ts` 逻辑变了
- 这些自动生成文件就会跟着变

汇报时不要把它们算成“单独做了 5 个大模块”，它们更像是配套产物。

---

## 现在可以怎么概括这次改动

如果你要用最简洁的人话去讲，现在可以直接说：

> 我在原始 a16z AI Town 上面，主要做了三件事：  
> 第一，把默认世界改成了可以由我们自己的场景模板驱动；  
> 第二，加了能直接看到角色视角和系统内部状态的调试层；  
> 第三，把原来写死的一部分对话和交互逻辑先拆开，方便后面继续做实验。

---

## 当前实际动过的核心文件清单

### 新增

- `data/scenes/index.ts`
- `data/scenes/pressConference.ts`
- `data/scenes/casualCommonArea.ts`
- `convex/aiTown/sceneTypes.ts`
- `convex/aiTown/sceneProtocol.ts`
- `convex/aiTown/sceneVisibility.ts`
- `convex/aiTown/sceneProtocol.test.ts`
- `convex/aiTown/sceneVisibility.test.ts`
- `convex/aiTown/interactionTiming.ts`
- `convex/aiTown/interactionTiming.test.ts`
- `convex/aiTown/conversationRules.ts`
- `convex/aiTown/defaultConversationRules.ts`
- `convex/aiTown/defaultConversationRules.test.ts`
- `convex/aiTown/conversationDecisionContext.ts`
- `convex/aiTown/demoMode.ts`
- `src/components/SceneDebugPanel.tsx`
- `convex/README.md`
- `convex/tsconfig.json`
- `.gitignore`
- `docs/aitown-current-progress-report.md`
- `docs/a16z-original-what-we-changed.md`
- 以及 `docs/` 下前面阶段留下的几份过程文档

### 修改

- `convex/init.ts`
- `convex/aiTown/agent.ts`
- `convex/aiTown/agentDescription.ts`
- `convex/aiTown/agentInputs.ts`
- `convex/aiTown/agentOperations.ts`
- `convex/aiTown/conversation.ts`
- `convex/aiTown/world.ts`
- `convex/agent/conversation.ts`
- `convex/testing.ts`
- `convex/util/llm.ts`
- `convex/world.ts`
- `src/components/Game.tsx`
- `convex/_generated/*` 自动生成文件

### 删除

- 当前没有需要单独汇报的永久性大删除

