# pipelines — 流水线阶段表

## 所属分组

主题与流水线

## 职责

定义每个主题下的流水线阶段。阶段通过 `stage_type` 标识逻辑角色，通过 `label`/`emoji` 提供主题化展示。

## 字段

| 字段          | 类型      | 约束                     | 说明                                                                    |
| ------------- | --------- | ------------------------ | ----------------------------------------------------------------------- |
| `id`          | serial    | PK                       | 自增主键                                                                |
| `theme_id`    | integer   | NOT NULL, FK → themes.id | 所属主题                                                                |
| `stage_type`  | text      | NOT NULL                 | 逻辑阶段标识，如 `planning`、`review`、`dispatch`、`execute`、`publish` |
| `sort_order`  | integer   | NOT NULL                 | 流水线中的顺序（越小越靠前）                                            |
| `label`       | text      | NOT NULL                 | 该主题下的阶段名称，如 `中书省`、`架构师`                               |
| `emoji`       | text      | NOT NULL, DEFAULT ''     | 阶段 emoji，如 `📜`、`🤖`                                               |
| `description` | text      |                          | 阶段职责描述                                                            |
| `color`       | text      |                          | 阶段专属色值，如 `#a07aff`                                              |
| `config`      | jsonb     | NOT NULL, DEFAULT '{}'   | 阶段配置（超时阈值、最大重试次数等）                                    |
| `created_at`  | timestamp | NOT NULL, DEFAULT now()  | 创建时间                                                                |
| `updated_at`  | timestamp | NOT NULL, DEFAULT now()  | 更新时间                                                                |

## 索引

| 名称                           | 字段                     | 类型   |
| ------------------------------ | ------------------------ | ------ |
| `pipelines_theme_stage_unique` | `theme_id`, `stage_type` | UNIQUE |
| `pipelines_theme_sort_idx`     | `theme_id`, `sort_order` | B-tree |

## 关联

- `pipelines.theme_id` → `themes.id`（ON DELETE CASCADE）

## 标准 stage_type 定义

业务逻辑只认 `stage_type`，不认 `label`。以下是系统级的标准阶段：

| stage_type | 逻辑含义  | 三省六部主题 label | 赛博朋克主题 label（示例） |
| ---------- | --------- | ------------------ | -------------------------- |
| `triage`   | 分拣/初筛 | 太子               | 接收器                     |
| `planning` | 规划/起草 | 中书省             | 架构师                     |
| `review`   | 审议/质控 | 门下省             | 安全审计                   |
| `dispatch` | 派发/调度 | 尚书省             | 调度中心                   |
| `execute`  | 执行/实施 | 六部               | 执行单元                   |
| `publish`  | 发布/交付 | 回奏               | 交付网关                   |

## config JSONB 结构示例

```json
{ "timeout_sec": 300, "max_retry": 3, "can_reject_to": "planning", "flavor_text": "门下省侍中手持朱笔，沉吟良久..." }
```

## 三省六部主题的完整 pipelines 数据

| sort_order | stage_type | label  | emoji | color   |
| ---------- | ---------- | ------ | ----- | ------- |
| 1          | `triage`   | 太子   | 🤴    | #e8a040 |
| 2          | `planning` | 中书省 | 📜    | #a07aff |
| 3          | `review`   | 门下省 | 🔍    | #6a9eff |
| 4          | `dispatch` | 尚书省 | 📮    | #6aef9a |
| 5          | `execute`  | 六部   | ⚙️    | #ff9a6a |
| 6          | `publish`  | 回奏   | ✅    | #2ecc8a |

## 备注

- `stage_type` 是代码中的 hard reference，改了要改代码
- `label`/`emoji`/`color` 是纯展示层，随便改不影响逻辑
- `config.can_reject_to` 定义驳回时退回到哪个阶段（如 review 驳回到 planning）
- 同一 theme 下 stage_type 不能重复（UNIQUE 约束）
