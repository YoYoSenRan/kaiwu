# 内容生命周期与状态机

## 完整生命周期

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   proposals (选题池)                                                         │
│   ┌──────────────┐                                                         │
│   │   pending     │                                                         │
│   │   ↓           │                                                         │
│   │   approved ───┼──→ productions (正式作品)                                │
│   │   ↓           │    ┌────────────────────────────────────────────────┐   │
│   │   rejected    │    │                                                │   │
│   │   ↓           │    │   triage → planning → review → dispatch       │   │
│   │   expired     │    │                ↑  rejected │                   │   │
│   └──────────────┘    │                └───────────┘                   │   │
│                        │                                                │   │
│                        │   → executing → publishing → done              │   │
│                        │        │                                       │   │
│                        │        └── production_tasks (子任务)            │   │
│                        │            pending → in_progress → done        │   │
│                        │                                                │   │
│                        └─────────────────────┬──────────────────────────┘   │
│                                              │                              │
│   publications (发布)                         │                              │
│   ┌──────────────────────────────────────────▼─┐                           │
│   │   pending → deploying → published          │                           │
│   │                  ↓                          │                           │
│   │               failed → retrying → published │                           │
│   └────────────────────────────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 状态机详细定义

### proposals 状态

```
pending ──→ approved     选题通过，创建 production
   │
   ├──→ rejected         选题不合格
   │
   └──→ expired          超时未处理
```

合法流转：

| 当前状态   | 可流转到                          |
| ---------- | --------------------------------- |
| `pending`  | `approved`, `rejected`, `expired` |
| `approved` | （终态）                          |
| `rejected` | （终态）                          |
| `expired`  | （终态）                          |

### productions 状态

```
triage ──→ planning ──→ review ──→ dispatch ──→ executing ──→ publishing ──→ done
                ↑           │                                      │
                └── rejected┘                                      │
                                                                   │
           任意非终态 ←──→ blocked                                    │
                                                                   │
           任意非终态 ──→ cancelled ←──────────────────────────────────┘
```

合法流转：

| 当前状态     | 可流转到                                       |
| ------------ | ---------------------------------------------- |
| `triage`     | `planning`, `cancelled`                        |
| `planning`   | `review`, `cancelled`, `blocked`               |
| `review`     | `dispatch`, `rejected`, `cancelled`, `blocked` |
| `rejected`   | `planning`（重新规划）                         |
| `dispatch`   | `executing`, `cancelled`, `blocked`            |
| `executing`  | `publishing`, `cancelled`, `blocked`           |
| `publishing` | `done`, `cancelled`, `blocked`                 |
| `blocked`    | 恢复到进入 blocked 前的状态                    |
| `done`       | （终态）                                       |
| `cancelled`  | （终态）                                       |

### production_tasks 状态

```
pending ──→ in_progress ──→ done
                 │
                 ├──→ blocked
                 │
                 └──→ cancelled
```

| 当前状态      | 可流转到                       |
| ------------- | ------------------------------ |
| `pending`     | `in_progress`, `cancelled`     |
| `in_progress` | `done`, `blocked`, `cancelled` |
| `blocked`     | `in_progress`                  |
| `done`        | （终态）                       |
| `cancelled`   | （终态）                       |

### publications 状态

```
pending ──→ deploying ──→ published
                │
                └──→ failed ──→ retrying ──→ published / failed
```

| 当前状态    | 可流转到              |
| ----------- | --------------------- |
| `pending`   | `deploying`           |
| `deploying` | `published`, `failed` |
| `failed`    | `retrying`            |
| `retrying`  | `published`, `failed` |
| `published` | （终态）              |

## 阶段与 Agent 的映射

| 阶段 (stage_type) | Agent 选择逻辑                                               |
| ----------------- | ------------------------------------------------------------ |
| `triage`          | 固定：stage_type=triage 的 Agent                             |
| `planning`        | 固定：stage_type=planning 的 Agent                           |
| `review`          | 固定：stage_type=review 的 Agent                             |
| `dispatch`        | 固定：stage_type=dispatch 的 Agent                           |
| `execute`         | 由 dispatch Agent 分配：按 sub_role 选择多个 Agent 并行      |
| `publish`         | 由 dispatch Agent 指定或默认使用 stage_type=publish 的 Agent |

## 驳回机制

门下省（review 阶段）驳回是核心质量保证机制：

1. review Agent 审议后输出 verdict = `reject`
2. production 状态设为 `rejected`，current_stage 回退到 `planning`
3. planning Agent 收到驳回原因，修改方案后重新提交 review
4. 可能多轮驳回，production_stages 表完整记录每一轮

```
production_stages 记录：
  planning → review (proceed)     第 1 轮提交
  review → planning (reject)      第 1 轮驳回
  planning → review (proceed)     第 2 轮提交
  review → dispatch (proceed)     第 2 轮通过
```

## 并行执行

execute 阶段的子任务（production_tasks）可以并行：

1. dispatch Agent 创建多个 production_tasks，分配给不同 Agent
2. 每个 Agent 独立执行自己的 task
3. 所有 tasks 完成（status = done）后，production 流转到 publishing
4. 任何一个 task 进入 blocked，production 也进入 blocked

## 自动触发 vs 手动干预

| 流转                         | 触发方式                                  |
| ---------------------------- | ----------------------------------------- |
| proposal → production        | 自动（定时调度产生选题 → 自动审批）或手动 |
| triage → planning            | 自动（分拣 Agent 判定后推进）             |
| planning → review            | 自动（planning Agent 完成后推进）         |
| review → dispatch / rejected | 自动（review Agent 判定后推进）           |
| dispatch → executing         | 自动（dispatch Agent 分配后推进）         |
| executing → publishing       | 自动（所有子任务完成后推进）              |
| publishing → done            | 自动（发布成功后推进）                    |
| 任意 → blocked               | 自动（检测到异常）或手动（Console 操作）  |
| 任意 → cancelled             | 手动（Console 操作）                      |
