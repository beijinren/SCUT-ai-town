# GM 实验记录

## 2026-05-14

### 实验：Willingness 轻介入改造

设定：

```text
主 willingness 分数改由外部 agent 自评分提供。
GM 只在第一轮、新人加入、被点名、话题变化等触发点接入。
同分时只留 GM 扩展接口，不立即实现 tie-break 模型。
```

结果：

```text
已新增外部分数接口、冲突检测接口、GM 独立模型配置文件。
保留内部 willingnessCalculator 作为兼容兜底。
```
