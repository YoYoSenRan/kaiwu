# models — LLM 模型表

## 所属分组

Agent 体系

## 职责

管理可用的 LLM 模型清单。Agent 通过 `model_id` 绑定当前使用的模型。

## 字段

| 字段         | 类型      | 约束                    | 说明                                           |
| ------------ | --------- | ----------------------- | ---------------------------------------------- |
| `id`         | serial    | PK                      | 自增主键                                       |
| `provider`   | text      | NOT NULL                | 模型提供商，如 `anthropic`、`openai`、`google` |
| `model_id`   | text      | NOT NULL, UNIQUE        | 模型标识符，如 `anthropic/claude-sonnet-4-6`   |
| `label`      | text      | NOT NULL                | 显示名称，如 `Claude Sonnet 4.6`               |
| `is_enabled` | boolean   | NOT NULL, DEFAULT true  | 是否可用                                       |
| `config`     | jsonb     | NOT NULL, DEFAULT '{}'  | 模型配置（温度、max_tokens 等默认值）          |
| `created_at` | timestamp | NOT NULL, DEFAULT now() | 创建时间                                       |
| `updated_at` | timestamp | NOT NULL, DEFAULT now() | 更新时间                                       |

## 索引

| 名称                     | 字段       | 类型   |
| ------------------------ | ---------- | ------ |
| `models_model_id_unique` | `model_id` | UNIQUE |
| `models_provider_idx`    | `provider` | B-tree |

## 关联

- `agents.model_id` → `models.id`

## config JSONB 结构示例

```json
{ "temperature": 0.7, "max_tokens": 4096, "cost_per_1k_input": 0.003, "cost_per_1k_output": 0.015 }
```

## 备注

- `model_id` 是传给 OpenClaw/LLM API 的实际标识符
- `label` 是 Console UI 展示的友好名称
- `config` 可存储模型的默认参数和成本信息
- 禁用模型（`is_enabled = false`）后，已绑定该模型的 Agent 不受影响，但不能新绑定
