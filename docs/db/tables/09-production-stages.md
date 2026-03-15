# production_stages — 流转审计表

## 所属分组

内容流水线

## 职责

记录每一次流水线阶段变更。是完整的审计链——谁在什么时候把作品从哪个阶段推到了哪个阶段，结论是什么。Site 上可以渲染为时间线故事。

## 字段

| 字段            | 类型      | 约束                          | 说明                                                       |
| --------------- | --------- | ----------------------------- | ---------------------------------------------------------- |
| `id`            | serial    | PK                            | 自增主键                                                   |
| `production_id` | text      | NOT NULL, FK → productions.id | 关联作品                                                   |
| `from_stage`    | text      |                               | 来源阶段（首条记录为空）                                   |
| `to_stage`      | text      | NOT NULL                      | 目标阶段                                                   |
| `agent_id`      | text      | FK → agents.id, NULLABLE      | 执行此操作的 Agent                                         |
| `verdict`       | text      | NOT NULL, DEFAULT 'proceed'   | 决策：`proceed`（通过）、`reject`（驳回）、`block`（阻塞） |
| `reason`        | text      |                               | 决策理由/备注                                              |
| `duration_sec`  | integer   |                               | 在上一阶段停留的秒数                                       |
| `meta`          | jsonb     | NOT NULL, DEFAULT '{}'        | 扩展（token 消耗、成本等）                                 |
| `created_at`    | timestamp | NOT NULL, DEFAULT now()       | 记录时间                                                   |

## 索引

| 名称                                       | 字段                          | 类型        |
| ------------------------------------------ | ----------------------------- | ----------- |
| `production_stages_production_id_idx`      | `production_id`               | B-tree      |
| `production_stages_created_at_idx`         | `created_at`                  | B-tree      |
| `production_stages_production_created_idx` | `production_id`, `created_at` | 复合 B-tree |

## 关联

- `production_stages.production_id` → `productions.id`（ON DELETE CASCADE）
- `production_stages.agent_id` → `agents.id`

## 示例数据（三省六部主题）

| production_id   | from_stage | to_stage | agent_id | verdict | reason                         |
| --------------- | ---------- | -------- | -------- | ------- | ------------------------------ |
| KW-20260315-001 | —          | triage   | taizi    | proceed | 新选题自动进入                 |
| KW-20260315-001 | triage     | planning | taizi    | proceed | 判定为正式内容需求             |
| KW-20260315-001 | planning   | review   | zhongshu | proceed | 方案已拆解为 3 个子任务        |
| KW-20260315-001 | review     | planning | menxia   | reject  | 缺少数据来源说明，驳回重新规划 |
| KW-20260315-001 | planning   | review   | zhongshu | proceed | 已补充数据来源                 |
| KW-20260315-001 | review     | dispatch | menxia   | proceed | 方案通过                       |
| KW-20260315-001 | dispatch   | execute  | shangshu | proceed | 已派发给户部+礼部              |
| KW-20260315-001 | execute    | publish  | shangshu | proceed | 所有子任务完成，产出已就绪     |
| KW-20260315-001 | publish    | done     | gongbu   | proceed | 发布成功                       |

## 在 Site 上的渲染

这些记录在 site 上渲染为时间线故事时，`from_stage`/`to_stage` 需要查 pipelines 表获取当前主题的 label 和 emoji：

```
🤴 太子 判定为正式旨意，转交中书省
📜 中书省 方案已拆解为 3 个子任务，提交门下省审议
🔍 门下省 封驳！缺少数据来源说明
📜 中书省 已补充数据来源，重新提交
🔍 门下省 准奏，方案通过
📮 尚书省 已派发给户部+礼部并行执行
✅ 回奏 所有任务完成，已发布
```

## 备注

- 这是纯追加表（append-only），不做更新和删除
- `duration_sec` 由业务层计算：本次 created_at - 上一条 created_at
- `meta` 可存储 token 消耗、成本等量化指标
- 驳回（reject）记录是最有故事感的部分——门下省为什么封驳、中书省怎么改的
