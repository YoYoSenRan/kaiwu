# themes — 主题定义表

## 所属分组

主题与流水线

## 职责

定义可替换的叙事主题。每个主题是一套完整的角色名称、视觉风格和阶段命名。系统同时只有一个激活主题。

## 字段

| 字段          | 类型      | 约束                    | 说明                                                |
| ------------- | --------- | ----------------------- | --------------------------------------------------- |
| `id`          | serial    | PK                      | 自增主键                                            |
| `slug`        | text      | NOT NULL, UNIQUE        | 主题标识符，如 `sansheng-liubu`、`cyberpunk`        |
| `name`        | text      | NOT NULL                | 主题显示名，如 `三省六部`、`赛博朋克`               |
| `description` | text      |                         | 主题简介                                            |
| `is_active`   | boolean   | NOT NULL, DEFAULT false | 是否为当前激活主题                                  |
| `config`      | jsonb     | NOT NULL, DEFAULT '{}'  | 主题级别配置（色值体系、字体、全局 flavor text 等） |
| `created_at`  | timestamp | NOT NULL, DEFAULT now() | 创建时间                                            |
| `updated_at`  | timestamp | NOT NULL, DEFAULT now() | 更新时间                                            |

## 索引

| 名称                   | 字段        | 类型                           |
| ---------------------- | ----------- | ------------------------------ |
| `themes_slug_unique`   | `slug`      | UNIQUE                         |
| `themes_is_active_idx` | `is_active` | B-tree（用于快速查找当前主题） |

## 关联

- `pipelines.theme_id` → `themes.id`

## config JSONB 结构示例

```json
{
  "colors": { "primary": "#D4AF37", "background": "#0A0A0A", "accent": "#FFBF00" },
  "typography": { "heading": "Noto Serif SC", "body": "Inter" },
  "flavor": { "approve": "准奏", "reject": "封驳", "complete": "回奏" }
}
```

## 内置主题

| slug             | name     | 说明                           |
| ---------------- | -------- | ------------------------------ |
| `sansheng-liubu` | 三省六部 | 默认主题，中国古代官僚体系叙事 |

## 备注

- 同一时刻只能有一个 `is_active = true` 的主题，切换时需事务保证
- `config.flavor` 存储主题特有的术语映射，UI 渲染时读取
- 新增主题 = 插入 themes 行 + 对应的 pipelines 行，零代码改动
