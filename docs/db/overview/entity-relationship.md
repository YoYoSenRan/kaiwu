# 表关系总览

## ER 图

```
 ┌──────────┐
 │  users   │
 │──────────│
 │ id (PK)  │
 │ username │
 └────┬─────┘
      │ 1:N
 ┌────▼─────┐
 │ sessions │
 │──────────│
 │ id (PK)  │
 │ user_id  │──→ users.id
 └──────────┘


 ┌──────────┐     1:N      ┌────────────┐
 │  themes  │─────────────▶│ pipelines  │
 │──────────│              │────────────│
 │ id (PK)  │              │ id (PK)    │
 │ slug     │              │ theme_id   │──→ themes.id
 │ name     │              │ stage_type │
 │ is_active│              │ sort_order │
 └──────────┘              │ label      │
                           │ emoji      │
                           └────────────┘


 ┌──────────┐
 │  agents  │
 │──────────│
 │ id (PK)  │  模型配置从 openclaw.json 实时读取，不入库
 │ stage_type│
 └──────────┘


 ┌────────────┐   1:N    ┌──────────────┐
 │ proposals  │─────────▶│ productions  │
 │────────────│          │──────────────│
 │ id (PK)    │          │ id (PK)      │
 │ source     │          │ proposal_id  │──→ proposals.id (可为空)
 │ status     │          │ status       │
 └────────────┘          │ output_dir   │
                         └──────┬───────┘
                                │
                 ┌──────────────┼──────────────┬──────────────┐
                 │ 1:N          │ 1:N          │ 1:N          │ 1:N
      ┌──────────▼────┐  ┌─────▼──────┐  ┌────▼───────┐  ┌──▼──────────────┐
      │ production_   │  │ production_│  │ production_│  │ publications    │
      │ stages        │  │ tasks      │  │ events     │  │─────────────────│
      │───────────────│  │────────────│  │────────────│  │ id (PK)         │
      │ id (PK)       │  │ id (PK)    │  │ id (PK)    │  │ production_id   │
      │ production_id │  │ production_│  │ production_│  │ channel         │
      │ stage_type    │  │ _id        │  │ _id        │  │ status          │
      │ agent_id      │  │ agent_id   │  │ topic      │  │ published_url   │
      │ verdict       │  │ status     │  │ payload    │  └─────────────────┘
      └───────────────┘  │ output_path│  └────────────┘
                         └────────────┘
```

## 关系说明

| 关系                            | 类型 | 说明                               |
| ------------------------------- | ---- | ---------------------------------- |
| users → sessions                | 1:N  | 一个用户多个登录会话               |
| themes → pipelines              | 1:N  | 一个主题定义多个流水线阶段         |
| proposals → productions         | 1:N  | 一个选题可能被多次立项（不同角度） |
| productions → production_stages | 1:N  | 一个作品经历多个审议阶段           |
| productions → production_tasks  | 1:N  | 一个作品拆分为多个子任务           |
| productions → production_events | 1:N  | 一个作品产生多条事件               |
| productions → publications      | 1:N  | 一个作品可发布到多个渠道           |
| agents → production_stages      | 1:N  | 一个 Agent 参与多个审议            |
| agents → production_tasks       | 1:N  | 一个 Agent 执行多个子任务          |

## 可为空的外键

| 字段                         | 说明                     |
| ---------------------------- | ------------------------ |
| `productions.proposal_id`    | 手动创建的作品不关联选题 |
| `production_tasks.parent_id` | 顶层子任务没有父级       |
