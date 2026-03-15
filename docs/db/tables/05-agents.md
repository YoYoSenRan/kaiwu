# agents — Agent 角色表

## 所属分组

Agent 体系

## 职责

定义系统中的 AI Agent 角色。每个 Agent 通过 `stage_type` 关联流水线阶段，决定它在流程中扮演什么逻辑角色。主题切换时，Agent 的展示信息从 pipelines 表读取。

## 字段

| 字段          | 类型      | 约束                    | 说明                                                                          |
| ------------- | --------- | ----------------------- | ----------------------------------------------------------------------------- |
| `id`          | text      | PK                      | Agent 标识符，如 `zhongshu`、`bingbu`                                         |
| `stage_type`  | text      | NOT NULL                | 逻辑角色：`planning`、`review`、`execute` 等                                  |
| `sub_role`    | text      |                         | 执行阶段的细分角色，如 `code`、`doc`、`infra`、`audit`（仅 execute 阶段使用） |
| `model_id`    | integer   | FK → models.id          | 当前绑定的 LLM 模型                                                           |
| `workspace`   | text      |                         | Agent 工作目录路径                                                            |
| `soul_prompt` | text      |                         | Agent 人格 prompt（SOUL.md 内容）                                             |
| `skills`      | jsonb     | NOT NULL, DEFAULT '[]'  | 已安装技能列表 `[{name, description, path}]`                                  |
| `config`      | jsonb     | NOT NULL, DEFAULT '{}'  | Agent 级配置（超时、重试等）                                                  |
| `is_enabled`  | boolean   | NOT NULL, DEFAULT true  | 是否启用                                                                      |
| `created_at`  | timestamp | NOT NULL, DEFAULT now() | 创建时间                                                                      |
| `updated_at`  | timestamp | NOT NULL, DEFAULT now() | 更新时间                                                                      |

## 索引

| 名称                    | 字段         | 类型   |
| ----------------------- | ------------ | ------ |
| `agents_stage_type_idx` | `stage_type` | B-tree |

## 关联

- `agents.model_id` → `models.id`
- `production_stages.agent_id` → `agents.id`
- `production_tasks.agent_id` → `agents.id`

## stage_type 与 sub_role 的关系

大多数阶段只有一个 Agent（triage、planning、review、dispatch、publish），`sub_role` 为空。

`execute` 阶段有多个并行 Agent，用 `sub_role` 区分：

| agent id   | stage_type | sub_role | 三省六部名称 |
| ---------- | ---------- | -------- | ------------ |
| `taizi`    | `triage`   | —        | 太子         |
| `zhongshu` | `planning` | —        | 中书省       |
| `menxia`   | `review`   | —        | 门下省       |
| `shangshu` | `dispatch` | —        | 尚书省       |
| `hubu`     | `execute`  | `data`   | 户部（数据） |
| `libu`     | `execute`  | `doc`    | 礼部（文档） |
| `bingbu`   | `execute`  | `code`   | 兵部（工程） |
| `xingbu`   | `execute`  | `audit`  | 刑部（合规） |
| `gongbu`   | `execute`  | `infra`  | 工部（基建） |
| `libu_hr`  | `execute`  | `hr`     | 吏部（人事） |

## skills JSONB 结构示例

```json
[{ "name": "code_review", "description": "代码审查（Python/JS/Go）", "path": "/skills/code_review/SKILL.md" }]
```

## 备注

- Agent ID 是稳定标识，即使换主题也不变
- 展示名称/emoji 不存在 agents 表里，从当前激活主题的 pipelines 表中获取
- `soul_prompt` 存储完整的人格提示词，对应 Edict 中的 SOUL.md
- `skills` 用 JSONB 而非独立表——当前 Agent 数量固定（约 12 个），skills 数量有限，独立表收益不大
