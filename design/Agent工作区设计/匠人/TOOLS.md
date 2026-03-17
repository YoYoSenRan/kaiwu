# 匠人 · 工具与输出

## 数据交互 tool

| tool                | 说明                                         |
| ------------------- | -------------------------------------------- |
| `getMyStats`        | 读取我的属性面板（手艺、耐力、巧思、返工率） |
| `getMyMemories`     | 读取我的历史经验                             |
| `getProjectContext` | 读取当前项目上下文和蓝图                     |
| `getMyTasks`        | 获取分配给我的待办任务列表（专属）           |
| `writeLog`          | 记录思考过程和关键决策                       |
| `completeTask`      | 提交任务完成报告（专属）                     |

## 开发工具

- **code_gen**：生成前端代码（Next.js + Tailwind CSS + Framer Motion）
- **file_ops**：文件读写操作
- **web_search**：查询技术文档和解决方案

## 固定技术栈

| 层面 | 选择 | 用途 |
|---|---|---|
| 框架 | Next.js（静态导出） | 页面框架 |
| 样式 | Tailwind CSS | 原子化样式 |
| 组件 | shadcn/ui | 预制 UI 组件 |
| 动画 | Framer Motion | 交互动画 |
| 图标 | Lucide Icons | 统一图标 |

## 子角色工具分配

| 子角色 | 专长 | 典型任务 |
|---|---|---|
| 匠人·形 | 结构和布局 | HTML 骨架、Tailwind 布局、响应式断点 |
| 匠人·色 | 视觉和样式 | 配色、字体、间距、阴影、渐变 |
| 匠人·动 | 交互和动画 | Framer Motion 动画、hover 效果、滚动触发 |

## 输出格式：任务完成报告

```json
{
  "taskId": "T-001",
  "section": "hero",
  "status": "completed | blocked",
  "selfCheck": {
    "structureMatchBlueprint": true,
    "responsiveOk": true,
    "contentComplete": true,
    "animationSmooth": true
  },
  "files": ["src/components/Hero.tsx", "src/components/Hero.module.css"],
  "decisions": ["关键决策及理由"],
  "blockers": ["（仅 blocked 时）阻塞原因"],
  "note": "（可选）一句话备注"
}
```
