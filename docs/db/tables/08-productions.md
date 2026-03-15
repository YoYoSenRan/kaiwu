# productions — 作品/产出表

## 所属分组

内容流水线

## 职责

经审议通过后正式立项的内容作品。这是流水线的核心主表，跟踪从立项到发布的完整生命周期。

## 字段

| 字段                  | 类型      | 约束                        | 说明                                           |
| --------------------- | --------- | --------------------------- | ---------------------------------------------- |
| `id`                  | text      | PK                          | 作品 ID，格式如 `KW-20260315-001`（日期+序号） |
| `proposal_id`         | integer   | FK → proposals.id, NULLABLE | 关联选题（手动创建时为空）                     |
| `title`               | text      | NOT NULL                    | 作品标题                                       |
| `description`         | text      |                             | 详细描述                                       |
| `status`              | text      | NOT NULL, DEFAULT 'triage'  | 当前状态（见状态机）                           |
| `current_stage`       | text      | NOT NULL, DEFAULT 'triage'  | 当前所在流水线阶段（stage_type）               |
| `current_agent`       | text      | FK → agents.id, NULLABLE    | 当前处理的 Agent                               |
| `priority`            | text      | NOT NULL, DEFAULT 'normal'  | 优先级：`low`、`normal`、`high`、`urgent`      |
| `output_dir`          | text      |                             | 产出目录路径                                   |
| `acceptance_criteria` | text      |                             | 验收标准                                       |
| `tags`                | jsonb     | NOT NULL, DEFAULT '[]'      | 标签                                           |
| `meta`                | jsonb     | NOT NULL, DEFAULT '{}'      | 扩展元数据                                     |
| `started_at`          | timestamp |                             | 开始处理时间                                   |
| `completed_at`        | timestamp |                             | 完成时间                                       |
| `is_archived`         | boolean   | NOT NULL, DEFAULT false     | 是否归档                                       |
| `created_at`          | timestamp | NOT NULL, DEFAULT now()     | 创建时间                                       |
| `updated_at`          | timestamp | NOT NULL, DEFAULT now()     | 更新时间                                       |

## 索引

| 名称                              | 字段                    | 类型        |
| --------------------------------- | ----------------------- | ----------- |
| `productions_status_idx`          | `status`                | B-tree      |
| `productions_current_stage_idx`   | `current_stage`         | B-tree      |
| `productions_is_archived_idx`     | `is_archived`           | B-tree      |
| `productions_created_at_idx`      | `created_at`            | B-tree      |
| `productions_status_archived_idx` | `status`, `is_archived` | 复合 B-tree |

## 关联

- `productions.proposal_id` → `proposals.id`
- `productions.current_agent` → `agents.id`
- `production_stages.production_id` → `productions.id`
- `production_tasks.production_id` → `productions.id`
- `production_events.production_id` → `productions.id`
- `publications.production_id` → `productions.id`

## 状态机

```
triage ──→ planning ──→ review ──┬──→ dispatch ──→ executing ──→ publishing ──→ done
                         ↑  │    │
                         │  │    └──→ cancelled
                         │  │
                         │  └── rejected（驳回，退回 planning）
                         │
                         └──────────────────────────────────────────────────┐
                                                                           │
                                                                  blocked ─┘
                                                              （可从任意非终态进入，
                                                               解除后恢复原状态）
```

### 状态说明

| status       | 含义               | 对应 current_stage     |
| ------------ | ------------------ | ---------------------- |
| `triage`     | 初筛/分拣          | `triage`               |
| `planning`   | 规划/起草中        | `planning`             |
| `review`     | 审议中             | `review`               |
| `rejected`   | 被驳回，退回规划   | `planning`             |
| `dispatch`   | 派发中             | `dispatch`             |
| `executing`  | 实施中（六部并行） | `execute`              |
| `publishing` | 发布中             | `publish`              |
| `done`       | 完成               | —                      |
| `cancelled`  | 取消               | —                      |
| `blocked`    | 阻塞               | （保留进入前的 stage） |

## ID 生成规则

格式：`KW-YYYYMMDD-NNN`

- `KW`：Kaiwu 缩写
- `YYYYMMDD`：创建日期
- `NNN`：当天顺序号，从 001 递增

## 备注

- `status` 和 `current_stage` 分开存：status 是业务状态，current_stage 是流水线位置。大多数时候一一对应，但 `blocked` 和 `rejected` 时会不同
- `output_dir` 存储指定的产出目录绝对路径，Agent 执行后的所有文件写入此目录
- `is_archived` 用于 Console 看板过滤，完成/取消的作品归档后不在默认视图显示
- 终态：`done`、`cancelled`
