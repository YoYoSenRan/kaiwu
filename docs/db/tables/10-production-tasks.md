# production_tasks — 实施子任务表

## 所属分组

内容流水线

## 职责

execute 阶段的任务拆分。一个 production 进入实施阶段后，由 dispatch Agent（尚书省）拆分为多个具体子任务，分配给不同的 execute Agent（六部）并行执行。支持树状层级。

## 字段

| 字段            | 类型      | 约束                               | 说明                      |
| --------------- | --------- | ---------------------------------- | ------------------------- |
| `id`            | serial    | PK                                 | 自增主键                  |
| `production_id` | text      | NOT NULL, FK → productions.id      | 关联作品                  |
| `parent_id`     | integer   | FK → production_tasks.id, NULLABLE | 父任务 ID（树状结构）     |
| `title`         | text      | NOT NULL                           | 子任务标题                |
| `description`   | text      |                                    | 详细描述                  |
| `agent_id`      | text      | FK → agents.id, NULLABLE           | 负责执行的 Agent          |
| `status`        | text      | NOT NULL, DEFAULT 'pending'        | 状态                      |
| `sort_order`    | integer   | NOT NULL, DEFAULT 0                | 排序                      |
| `output_path`   | text      |                                    | 子任务产出文件路径        |
| `checkpoints`   | jsonb     | NOT NULL, DEFAULT '[]'             | 检查点 `[{name, status}]` |
| `meta`          | jsonb     | NOT NULL, DEFAULT '{}'             | 扩展（token、耗时等）     |
| `started_at`    | timestamp |                                    | 开始时间                  |
| `completed_at`  | timestamp |                                    | 完成时间                  |
| `created_at`    | timestamp | NOT NULL, DEFAULT now()            | 创建时间                  |
| `updated_at`    | timestamp | NOT NULL, DEFAULT now()            | 更新时间                  |

## 索引

| 名称                                 | 字段            | 类型   |
| ------------------------------------ | --------------- | ------ |
| `production_tasks_production_id_idx` | `production_id` | B-tree |
| `production_tasks_agent_id_idx`      | `agent_id`      | B-tree |
| `production_tasks_status_idx`        | `status`        | B-tree |
| `production_tasks_parent_id_idx`     | `parent_id`     | B-tree |

## 关联

- `production_tasks.production_id` → `productions.id`（ON DELETE CASCADE）
- `production_tasks.agent_id` → `agents.id`
- `production_tasks.parent_id` → `production_tasks.id`（自引用，ON DELETE CASCADE）

## 状态流转

```
pending ──→ in_progress ──→ done
                │
                ├──→ blocked
                │
                └──→ cancelled
```

| status        | 含义   |
| ------------- | ------ |
| `pending`     | 待执行 |
| `in_progress` | 执行中 |
| `done`        | 完成   |
| `blocked`     | 阻塞   |
| `cancelled`   | 取消   |

## checkpoints JSONB 结构示例

```json
[
  { "name": "数据采集", "status": "done" },
  { "name": "数据清洗", "status": "done" },
  { "name": "报告生成", "status": "in_progress" },
  { "name": "格式校验", "status": "pending" }
]
```

## 示例数据

| production_id   | title            | agent_id | status      | output_path                 |
| --------------- | ---------------- | -------- | ----------- | --------------------------- |
| KW-20260315-001 | 采集竞品定价数据 | hubu     | done        | /output/kw-001/pricing.json |
| KW-20260315-001 | 撰写分析报告     | libu     | in_progress | /output/kw-001/report.md    |
| KW-20260315-001 | 代码安全审查     | xingbu   | pending     | —                           |

## 备注

- 树状结构通过 `parent_id` 实现：顶层子任务 parent_id 为空，子任务的子任务指向其父
- 当所有子任务 status = done 时，production 可以从 executing 流转到 publishing
- `output_path` 是相对于 production 的 `output_dir` 的子路径
- `checkpoints` 提供比 status 更细粒度的进度跟踪（一个子任务内部的步骤）
