# Temporary Semantic Map Data

This folder stores temporary semantic map data before Unity exports the final version.

Important:

- This is not GM mock data.
- The data is inserted into the real `maps` table by `convex/init.ts`.
- The real agent loop reads it through `WorldMap.semanticObjects` and `WorldMap.semanticAreas`.
- When Unity export is ready, replace the data source here or wire the exporter to fill the same fields.

Current demo file:

```text
crossMajorWorkshopSemantic.ts
```

It provides a few semantic areas and objects for early testing:

- 休息区
- 发布台附近
- 安静角落
- 饮料桌
- 沙发
- 发布台
- 安静角落展示板
