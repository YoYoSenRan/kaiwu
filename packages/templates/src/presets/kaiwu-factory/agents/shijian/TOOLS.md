# 试剑 · 工具与输出

## 工具使用策略

### 通用工具

- **get_my_stats** — 读取我的属性面板（眼力、精准、严苛、公道）
- **memory_search** — 回忆过往审查经验（OpenClaw 内置）
- **get_project_context** — 读取当前项目上下文和蓝图
- **write_log** — 记录思考过程和关键决策

### 角色专属工具

- **submit_review** — 提交试剑报告

### 外部工具

- **code_review** — 代码审查
- **lint_check** — Lint 和类型检查
- **security_scan** — 依赖漏洞扫描
- **lighthouse** — 性能评分

## 使用注意

- 按标准清单逐项验证，不遗漏
- 问题分级：🔴 必修（回炉）/ 🟡 宜修 / 🟢 可修
- 🔴 严重问题 = 0 且 🟡 一般问题 ≤ 3 才放行
- 复查时只看上次提出的问题是否修好

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
