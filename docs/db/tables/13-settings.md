# settings — 系统配置表

## 所属分组

系统

## 职责

键值对形式存储系统级配置。Console UI 可管理，业务代码读取。

## 字段

| 字段          | 类型      | 约束                    | 说明                         |
| ------------- | --------- | ----------------------- | ---------------------------- |
| `key`         | text      | PK                      | 配置键                       |
| `value`       | jsonb     | NOT NULL                | 配置值（支持任意 JSON 结构） |
| `description` | text      |                         | 配置说明                     |
| `updated_at`  | timestamp | NOT NULL, DEFAULT now() | 最后更新时间                 |

## 预置配置项

| key                             | 默认 value                 | 说明                  |
| ------------------------------- | -------------------------- | --------------------- |
| `openclaw.gateway_url`          | `"http://localhost:18789"` | OpenClaw Gateway 地址 |
| `openclaw.project_dir`          | `null`                     | OpenClaw 项目目录     |
| `output.root_dir`               | `"/data/kaiwu/output"`     | 产出物根目录          |
| `schedule.default_interval_sec` | `60`                       | 默认调度扫描间隔      |
| `schedule.stall_threshold_sec`  | `180`                      | 任务停滞告警阈值      |
| `publish.default_channel`       | `"site"`                   | 默认发布渠道          |
| `feishu.webhook_url`            | `""`                       | 飞书 Webhook 地址     |
| `feishu.enabled`                | `false`                    | 是否启用飞书通知      |

## 备注

- 用 JSONB 存值而非 text，支持结构化配置（数组、对象）
- 不存敏感信息（API Key 等）——那些走环境变量
- Console 提供 UI 编辑，每次修改自动更新 `updated_at`
