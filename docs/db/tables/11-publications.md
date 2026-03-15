# publications — 发布记录表

## 所属分组

发布

## 职责

跟踪作品的最后一公里——从完成到发布的全过程。一个 production 可以发布到多个渠道（网站、社交媒体、邮件等），每个渠道一条记录。

## 字段

| 字段             | 类型      | 约束                          | 说明                                                     |
| ---------------- | --------- | ----------------------------- | -------------------------------------------------------- |
| `id`             | serial    | PK                            | 自增主键                                                 |
| `production_id`  | text      | NOT NULL, FK → productions.id | 关联作品                                                 |
| `channel`        | text      | NOT NULL                      | 发布渠道：`site`、`blog`、`social`、`email`、`feishu` 等 |
| `status`         | text      | NOT NULL, DEFAULT 'pending'   | 状态                                                     |
| `agent_id`       | text      | FK → agents.id, NULLABLE      | 执行发布的 Agent                                         |
| `published_url`  | text      |                               | 发布后的最终 URL                                         |
| `published_path` | text      |                               | 发布后的文件路径                                         |
| `deploy_log`     | text      |                               | 部署日志（错误排查用）                                   |
| `meta`           | jsonb     | NOT NULL, DEFAULT '{}'        | 扩展（部署配置、CDN 状态等）                             |
| `published_at`   | timestamp |                               | 实际发布时间                                             |
| `created_at`     | timestamp | NOT NULL, DEFAULT now()       | 创建时间                                                 |
| `updated_at`     | timestamp | NOT NULL, DEFAULT now()       | 更新时间                                                 |

## 索引

| 名称                             | 字段            | 类型   |
| -------------------------------- | --------------- | ------ |
| `publications_production_id_idx` | `production_id` | B-tree |
| `publications_status_idx`        | `status`        | B-tree |
| `publications_channel_idx`       | `channel`       | B-tree |

## 关联

- `publications.production_id` → `productions.id`（ON DELETE CASCADE）
- `publications.agent_id` → `agents.id`

## 状态流转

```
pending ──→ deploying ──→ published
                │
                └──→ failed ──→ retrying ──→ published
                                    │
                                    └──→ failed（最终失败）
```

| status      | 含义     |
| ----------- | -------- |
| `pending`   | 等待发布 |
| `deploying` | 部署中   |
| `published` | 已发布   |
| `failed`    | 发布失败 |
| `retrying`  | 重试中   |

## 备注

- 发布是独立于 production 生命周期的——production 状态变为 done 后，可以触发一个或多个 publications
- `deploy_log` 存储部署过程的关键日志，帮助排查失败原因
- 失败后可重试，重试次数不在表中限制，由业务逻辑控制
- 同一 production 发布到同一 channel 可以有多条记录（重新发布场景）
