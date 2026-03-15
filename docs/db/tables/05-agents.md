# agents — Agent 角色表

## 所属分组

Agent 体系

## 职责

存储 Kaiwu 侧的 Agent 管理元数据。每个 Agent 通过 `stage_type` 关联流水线阶段，决定它在流程中扮演什么逻辑角色。主题切换时，Agent 的展示信息从 pipelines 表读取。

**数据来源：** Agent ID 从 OpenClaw 运行时（`~/.openclaw/openclaw.json`）同步入库。`stage_type`、`sub_role`、`config` 等 Kaiwu 独有字段由 Kaiwu 自身管理。

**不入库的内容：** 工作区文件（SOUL.md、Skills 目录、workspace 路径）和模型配置直接读 OpenClaw 运行时（`~/.openclaw/openclaw.json` 和 `~/.openclaw/workspace-{id}/`），不存数据库。Console 修改模型也是直接写 openclaw.json 后重启 Gateway。

## 字段

| 字段         | 类型      | 约束                    | 说明                                                                                       |
| ------------ | --------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| `id`         | text      | PK                      | Agent 标识符，如 `zhongshu`、`bingbu`（同步自 openclaw.json）                              |
| `stage_type` | text      | NOT NULL                | 流水线逻辑角色：`triage` / `planning` / `review` / `dispatch` / `execute` / `publish`      |
| `sub_role`   | text      |                         | execute 阶段的细分角色：`code` / `doc` / `data` / `audit` / `infra` / `hr`（其他阶段为空） |
| `config`     | jsonb     | NOT NULL, DEFAULT '{}'  | Kaiwu 侧配置（超时、重试等）                                                               |
| `is_enabled` | boolean   | NOT NULL, DEFAULT true  | 是否启用                                                                                   |
| `created_at` | timestamp | NOT NULL, DEFAULT now() | 创建时间                                                                                   |
| `updated_at` | timestamp | NOT NULL, DEFAULT now() | 更新时间                                                                                   |

## 索引

| 名称                    | 字段         | 类型   |
| ----------------------- | ------------ | ------ |
| `agents_stage_type_idx` | `stage_type` | B-tree |

## 关联

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

## 数据同步策略

```
OpenClaw 运行时（source of truth）
  ~/.openclaw/openclaw.json         → 同步 id 到 agents 表
  ~/.openclaw/workspace-{id}/       → 不入库，需要时实时读取
    ├── soul.md                       SOUL.md 直接读文件
    └── skills/                       Skills 直接扫目录

Console 修改配置（如切换模型）
  → 直接写 openclaw.json → 重启 Gateway
  → 不经过数据库
```

- 新增 Agent：同步时自动 upsert 入库
- 删除 Agent：同步时标记 `is_enabled = false`

## 文件系统读取接口（不入库，应用层实现）

| 数据           | 读取路径                                               | 说明                      |
| -------------- | ------------------------------------------------------ | ------------------------- |
| workspace 路径 | `openclaw.json → agents.list[].workspace`              | Agent 工作目录            |
| 当前模型       | `openclaw.json → agents.list[].model`                  | Agent 绑定的 LLM 模型     |
| 可用模型列表   | `openclaw.json → agents.defaults.model` + 已知模型枚举 | Console 模型切换下拉框    |
| SOUL.md        | `{workspace}/soul.md`                                  | Agent 人格提示词          |
| Skills 列表    | `{workspace}/skills/`                                  | 扫描子目录，读取 SKILL.md |
| 权限矩阵       | `openclaw.json → agents.list[].subagents.allowAgents`  | 谁能给谁发消息            |

## 备注

- Agent ID 是稳定标识，即使换主题也不变
- 展示名称/emoji 不存在 agents 表里，从当前激活主题的 pipelines 表中获取
- 数据库是 OpenClaw 运行时的**只读镜像**，不是配置源
