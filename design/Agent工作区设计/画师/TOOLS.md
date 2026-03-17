# 画师 · 工具与输出

## 数据交互 tool

| tool                | 说明                                       |
| ------------------- | ------------------------------------------ |
| `getMyStats`        | 读取我的属性面板（精微、全局、化繁、效率） |
| `getMyMemories`     | 读取我的历史经验                           |
| `getProjectContext` | 读取当前项目上下文、采风报告和裁决书       |
| `writeLog`          | 记录思考过程和关键决策                     |
| `submitBlueprint`   | 提交造物蓝图（专属）                       |

## 设计工具

- **code_gen**：生成技术架构图、数据模型草案

## 输出格式：造物蓝图

```json
{
  "productDefinition": { "coreFunctions": ["MVP 功能列表"], "userStories": ["用户故事"], "priority": { "must": [], "should": [], "could": [], "wont": [] } },
  "architecture": {
    "techStack": { "frontend": "", "backend": "", "database": "", "hosting": "" },
    "systemDesign": "架构描述（Markdown）",
    "dataModel": "数据模型草案（Markdown）"
  },
  "tasks": [{ "id": "T-001", "title": "任务标题", "description": "任务描述", "assignTo": "jiangren-qi | jiangren-gu | jiangren-yan", "dependsOn": [], "priority": 1 }],
  "risks": [{ "risk": "风险描述", "mitigation": "应对策略" }]
}
```
