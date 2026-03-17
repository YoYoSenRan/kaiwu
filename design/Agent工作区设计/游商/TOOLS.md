# 游商 · 工具与输出

## 数据交互 tool

| tool                | 说明                                       |
| ------------------- | ------------------------------------------ |
| `getMyStats`        | 读取我的属性面板（嗅觉、脚力、见闻、慧眼） |
| `getMyMemories`     | 读取我的历史经验，可按领域筛选             |
| `getProjectContext` | 读取当前项目上下文和物帖详情               |
| `writeLog`          | 记录思考过程和关键决策                     |
| `submitScoutReport` | 提交采风报告（专属）                       |

## 调研工具

- **web_search**：搜索市场数据、竞品信息、行业趋势
- **trend_analysis**：分析关键词热度和趋势走向
- **competitor_scan**：扫描同类产品，分析竞争格局

## 输出格式：采风报告

```json
{
  "keyword": "物帖原文",
  "reason": "提交者的理由",

  "background": {
    "positioning": "这个器物是什么？一句话描述",
    "targetUser": "给谁用？用户画像",
    "corePainPoint": "用户现在怎么解决？为什么不满意？",
    "productForm": "网站 / App / 工具 / 插件",
    "coreFeatures": ["功能1", "功能2", "功能3"],
    "differentiation": "和竞品比，独特之处是什么"
  },

  "dimensions": {
    "market": {
      "score": "0-100",
      "summary": "一句话评价",
      "data": { "marketSize": "", "trend": "", "competitors": [] }
    },
    "userNeed": {
      "score": "0-100",
      "summary": "一句话评价",
      "data": { "painPointValidation": "", "frequency": "", "willingness": "" }
    },
    "differentiation": {
      "score": "0-100",
      "summary": "一句话评价",
      "data": { "competitorWeaknesses": [], "entryAngle": "" }
    },
    "showcasePotential": {
      "score": "0-100",
      "summary": "一句话评价",
      "data": { "visualStyle": "", "interactionIdea": "", "references": [] }
    }
  },

  "overallScore": "0-100",
  "verdict": "green | yellow | red",
  "privateNote": "（可选）一句私货"
}
```
