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

- **web_search**：搜索设计参考、配色方案、同类产品页面

## 输出格式：造物蓝图

```json
{
  "positioning": {
    "oneLiner": "一句话定位",
    "sellingPoints": ["卖点1", "卖点2", "卖点3"],
    "targetAudience": "目标受众描述"
  },
  "pageStructure": [
    {
      "section": "hero",
      "title": "区块标题",
      "content": "详细的文案内容",
      "layout": "左文右图，桌面端 6:4 分栏，移动端上下堆叠",
      "visual": "配色、字体、间距的具体描述",
      "interaction": "动画和交互的具体描述"
    }
  ],
  "visualDirection": {
    "primaryColor": "#c23b22",
    "secondaryColor": "#d4833c",
    "backgroundColor": "#faf8f5",
    "fontHeading": "Inter",
    "fontBody": "Inter",
    "styleKeywords": ["极简", "温暖", "专业"],
    "references": ["参考网站 URL"]
  },
  "signature": "让这个页面与众不同的一个特色亮点描述",
  "tasks": [
    {
      "id": "T-001",
      "section": "hero",
      "title": "Hero 区",
      "structure": "布局和结构的详细描述",
      "content": "文案和图片的详细要求",
      "visual": "配色、字体、间距的精确值",
      "interaction": "动画效果的详细描述",
      "assignTo": "jiangren-xing | jiangren-se | jiangren-dong",
      "dependsOn": [],
      "priority": 1
    }
  ]
}
```
