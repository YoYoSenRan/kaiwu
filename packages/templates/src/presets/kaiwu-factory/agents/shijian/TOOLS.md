# 试剑 · 工具与输出

## 数据交互 tool

| tool                | 说明                                       |
| ------------------- | ------------------------------------------ |
| `getMyStats`        | 读取我的属性面板（眼力、精准、严苛、公道） |
| `getMyMemories`     | 读取我的历史经验                           |
| `getProjectContext` | 读取当前项目上下文和蓝图                   |
| `writeLog`          | 记录思考过程和关键决策                     |
| `submitReview`      | 提交试剑报告（专属）                       |

## 审查工具

- **code_review**：代码审查
- **lint_check**：Lint 和类型检查
- **security_scan**：依赖漏洞扫描
- **lighthouse**：性能评分

## 审查清单

| 维度       | 内容                       |
| ---------- | -------------------------- |
| 代码质量   | Lint、类型检查、代码规范   |
| 安全性     | 依赖漏洞扫描、XSS/注入检查 |
| 性能       | Lighthouse 评分、加载时间  |
| 功能完整性 | 对照 MVP 功能列表逐项验证  |
| 用户体验   | 关键路径走查、边界场景覆盖 |

## 输出格式：试剑报告

```json
{
  "verdict": "pass | fail",
  "issues": [
    {
      "severity": "critical | warning | info",
      "category": "code | security | performance | function | ux",
      "description": "问题描述",
      "location": "文件路径:行号",
      "suggestion": "修复方向"
    }
  ],
  "summary": { "critical": 0, "warning": 0, "info": 0 }
}
```
