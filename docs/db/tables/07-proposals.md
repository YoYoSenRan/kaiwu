# proposals — 选题/灵感表

## 所属分组

内容流水线

## 职责

存储内容选题和灵感。这是流水线的入口——无论是定时任务自动发现、手动输入还是外部信号触发，所有内容想法先进入这个池子，经过筛选后才可能变成正式的 production。

## 字段

| 字段            | 类型      | 约束                        | 说明                                               |
| --------------- | --------- | --------------------------- | -------------------------------------------------- |
| `id`            | serial    | PK                          | 自增主键                                           |
| `title`         | text      | NOT NULL                    | 选题标题                                           |
| `description`   | text      |                             | 详细描述                                           |
| `source`        | text      | NOT NULL, DEFAULT 'manual'  | 来源类型：`manual`、`cron`、`external`、`agent`    |
| `source_ref`    | text      |                             | 来源引用（如定时任务 ID、外部 URL、Agent ID）      |
| `status`        | text      | NOT NULL, DEFAULT 'pending' | 状态：`pending`、`approved`、`rejected`、`expired` |
| `priority`      | text      | NOT NULL, DEFAULT 'normal'  | 优先级：`low`、`normal`、`high`、`urgent`          |
| `tags`          | jsonb     | NOT NULL, DEFAULT '[]'      | 标签列表 `["AI", "竞品", "周报"]`                  |
| `meta`          | jsonb     | NOT NULL, DEFAULT '{}'      | 来源元数据（灵活字段，结构因 source 而异）         |
| `reviewed_at`   | timestamp |                             | 审核时间                                           |
| `reviewed_by`   | text      |                             | 审核者（Agent ID 或 user）                         |
| `reject_reason` | text      |                             | 驳回原因                                           |
| `created_at`    | timestamp | NOT NULL, DEFAULT now()     | 创建时间                                           |
| `updated_at`    | timestamp | NOT NULL, DEFAULT now()     | 更新时间                                           |

## 索引

| 名称                       | 字段         | 类型   |
| -------------------------- | ------------ | ------ |
| `proposals_status_idx`     | `status`     | B-tree |
| `proposals_source_idx`     | `source`     | B-tree |
| `proposals_created_at_idx` | `created_at` | B-tree |

## 关联

- `productions.proposal_id` → `proposals.id`

## 状态流转

```
pending ──→ approved ──→ （创建 production）
   │
   └──→ rejected
   │
   └──→ expired（超时未处理自动过期）
```

## meta JSONB 结构示例

```json
// source = "cron"
{
  "schedule_name": "每日竞品监控",
  "cron_expression": "0 9 * * *",
  "trigger_time": "2026-03-15T09:00:00Z"
}

// source = "external"
{
  "webhook_source": "github",
  "event_type": "issue.created",
  "issue_url": "https://github.com/xxx/yyy/issues/42"
}

// source = "agent"
{
  "agent_id": "zaochao",
  "discovery_type": "rss_scan",
  "raw_items": [...]
}
```

## 备注

- proposals 是"宽进严出"的——允许大量产生，大量被驳回
- `source` + `source_ref` 组合追踪来源，方便去重和溯源
- `tags` 用 JSONB 数组而非关联表——选题标签变化频繁，不需要外键约束
- `expired` 状态由定时清理任务设置，超过 N 天未审核的自动过期
- 一个 proposal 通过后可能产生多个 productions（不同角度切入同一选题）
