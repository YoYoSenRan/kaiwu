# 掌秤 · 工具与输出

## 数据交互 tool

| tool                | 说明                                       |
| ------------------- | ------------------------------------------ |
| `get_my_stats`        | 读取我的属性面板（公正、果断、权衡、远见） |
| `memory_search`     | 读取我的历史经验                           |
| `get_project_context` | 读取当前项目上下文和采风报告               |
| `get_debate_history`  | 读取完整辩论记录（专属）                   |
| `write_log`          | 记录思考过程和关键决策                     |
| `submit_verdict`     | 提交裁决书（专属）                         |

## 输出格式：裁决书

```json
{
  "verdict": "approved | rejected | conditional",
  "reason": "裁决理由（Markdown）",
  "optimistPoints": ["采纳的说客论点"],
  "skepticPoints": ["采纳的诤臣论点"],
  "conditions": ["（仅 conditional 时）附带条件列表"],
  "epitaph": "（仅 rejected 时）封存辞"
}
```
