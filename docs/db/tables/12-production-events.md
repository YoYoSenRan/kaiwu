# production_events — 事件流表

## 所属分组

可观测

## 职责

全量事件记录。每一个系统行为（状态变更、Agent 输出、调度触发、错误发生）都写入一条事件。支持时间线回放和问题排查。

## 字段

| 字段            | 类型      | 约束                          | 说明                                                                                |
| --------------- | --------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `id`            | serial    | PK                            | 自增主键                                                                            |
| `production_id` | text      | FK → productions.id, NULLABLE | 关联作品（系统级事件可为空）                                                        |
| `topic`         | text      | NOT NULL                      | 事件主题，如 `production.created`、`stage.changed`、`agent.output`、`task.progress` |
| `event_type`    | text      | NOT NULL                      | 事件子类型，如 `state.planning`、`verdict.reject`                                   |
| `producer`      | text      | NOT NULL                      | 事件产生者，如 `system`、`agent.zhongshu`                                           |
| `payload`       | jsonb     | NOT NULL, DEFAULT '{}'        | 事件负载（结构因 topic 而异）                                                       |
| `created_at`    | timestamp | NOT NULL, DEFAULT now()       | 事件时间                                                                            |

## 索引

| 名称                                     | 字段                     | 类型        |
| ---------------------------------------- | ------------------------ | ----------- |
| `production_events_production_id_idx`    | `production_id`          | B-tree      |
| `production_events_topic_idx`            | `topic`                  | B-tree      |
| `production_events_created_at_idx`       | `created_at`             | B-tree      |
| `production_events_production_topic_idx` | `production_id`, `topic` | 复合 B-tree |

## 关联

- `production_events.production_id` → `productions.id`（ON DELETE CASCADE）

## 标准 topic 定义

| topic                | 触发时机           | payload 示例                             |
| -------------------- | ------------------ | ---------------------------------------- |
| `production.created` | 作品创建           | `{title, source, priority}`              |
| `stage.changed`      | 阶段变更           | `{from, to, agent, verdict, reason}`     |
| `agent.output`       | Agent 产出         | `{agent, content_preview, tokens, cost}` |
| `agent.thinking`     | Agent 思考（可选） | `{agent, step, type, content}`           |
| `task.created`       | 子任务创建         | `{task_id, title, agent}`                |
| `task.progress`      | 子任务进展         | `{task_id, status, checkpoints}`         |
| `task.completed`     | 子任务完成         | `{task_id, output_path}`                 |
| `publish.started`    | 开始发布           | `{channel, agent}`                       |
| `publish.completed`  | 发布完成           | `{channel, url}`                         |
| `publish.failed`     | 发布失败           | `{channel, error}`                       |
| `system.error`       | 系统错误           | `{error, stack, context}`                |
| `system.schedule`    | 调度触发           | `{schedule_name, trigger_time}`          |

## 备注

- 纯追加表（append-only），不做更新和删除
- 这张表会是数据量最大的表，考虑定期归档（按月分表或清理 N 天前的记录）
- Agent 思考流（`agent.thinking`）作为事件存在此表中，不单独建 thoughts 表。如果未来量大需要优化，再拆分
- `production_id` 可为空：系统级事件（如调度触发、全局错误）不关联具体作品
