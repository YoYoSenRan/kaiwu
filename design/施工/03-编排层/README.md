# 03 — 编排层

## 目标

实现造物流的核心引擎：tick 主循环、阶段流转、自动决策、四级自愈、流程追溯。完成后更鼓 Cron 触发时可以自动推进造物令。

## 依赖

- 00-数据库（表定义）
- 02-API层（Agent 调用接口 + 事件写入）

## 文件清单

```
packages/domain/
├── src/
│   ├── pipeline/
│   │   ├── engine.ts                # tick() 主循环
│   │   ├── scheduler.ts             # 阶段调度（决定下一步调谁）
│   │   ├── phases/
│   │   │   ├── scout.ts             # 采风阶段逻辑
│   │   │   ├── council.ts           # 过堂阶段逻辑（辩论轮次调度）
│   │   │   ├── architect.ts         # 绘图阶段逻辑
│   │   │   ├── builder.ts           # 锻造阶段逻辑（分步 + 子角色并行）
│   │   │   ├── inspector.ts         # 试剑阶段逻辑（轻检 + 全检）
│   │   │   └── deployer.ts          # 鸣锣阶段逻辑
│   │   ├── decisions.ts             # 自动决策规则（评分阈值、裁决判定）
│   │   ├── transitions.ts           # 阶段流转（事务内状态变更）
│   │   ├── recovery.ts              # 四级自愈（L1-L4）
│   │   ├── tracking.ts              # 流程追溯（事件记录）
│   │   └── backoff.ts               # 指数退避逻辑
│   ├── agents/
│   │   ├── caller.ts                # Agent 调用封装（Gateway API → isolated session）
│   │   ├── activity.ts              # Agent 状态和活动描述更新
│   │   └── stats.ts                 # 属性计算和更新
│   ├── events/
│   │   ├── bus.ts                   # EventBus（内存发布/订阅）
│   │   └── emitter.ts               # 事件写入 events 表 + 发布到 bus
│   └── index.ts                     # barrel 导出
├── package.json
└── tsconfig.json
```

## 实现步骤

### Step 1：EventBus

文件：`src/events/bus.ts` + `src/events/emitter.ts`

- 内存级发布/订阅（不用 Redis，MVP 够用）
- `emitEvent(event)` = 写入 events 表 + publish 到 bus
- SSE 端点从 bus 订阅

### Step 2：Agent 调用封装

文件：`src/agents/caller.ts`

```ts
interface CallAgentOptions {
  agentId: string
  message: string
  projectPath?: string    // 锻造阶段需要
  timeout?: number        // 超时（毫秒）
}

interface CallAgentResult {
  success: boolean
  output?: unknown
  error?: string
  durationMs: number
}

async function callAgent(options: CallAgentOptions): Promise<CallAgentResult>
```

- 通过 Gateway API 创建 isolated session
- 发送 message，等待 Agent 返回
- 记录 agent_called 事件
- 超时处理

### Step 3：tick() 主循环

文件：`src/pipeline/engine.ts`

```ts
async function tick(): Promise<TickResult> {
  // 1. 检查 Gateway 健康
  // 2. 取当前 running 的造物令（只有一个）
  //    没有 → 从物帖池取权重最高的，创建造物令
  // 3. 根据当前阶段，调用对应的阶段处理器
  // 4. 处理返回结果（成功 → 推进 / 失败 → 自愈）
  // 5. 记录 tick_executed 事件
  // 6. 发送 SSE
}
```

### Step 4：阶段调度器

文件：`src/pipeline/scheduler.ts`

根据 `projects.current_phase` 分发到对应的阶段处理器：

```ts
function getPhaseHandler(phaseType: string): PhaseHandler {
  switch (phaseType) {
    case "scout": return scoutHandler
    case "council": return councilHandler
    case "architect": return architectHandler
    case "builder": return builderHandler
    case "inspector": return inspectorHandler
    case "deployer": return deployerHandler
  }
}
```

### Step 5：各阶段处理器（骨架）

每个阶段处理器实现统一接口：

```ts
interface PhaseHandler {
  /** 推进一步，返回是否完成 */
  advance(project: Project, phase: Phase): Promise<PhaseStepResult>
}

interface PhaseStepResult {
  status: "progressing" | "completed" | "failed"
  output?: unknown
  error?: string
}
```

Phase 0 阶段只实现骨架（返回 mock 数据），具体逻辑在后续模块（06-游商采风、07-过堂辩论等）中填充。

### Step 6：阶段流转

文件：`src/pipeline/transitions.ts`

```ts
async function transitionPhase(projectId: string, decision: Decision): Promise<void> {
  // 数据库事务内：
  // 1. 更新 phases.status = completed
  // 2. 执行决策规则（通过 → 创建下一阶段 / 封存 → 更新 projects.status）
  // 3. 更新 projects.current_phase
  // 4. 写入 phase_transition 事件
  // 事务外：
  // 5. 更新 Agent activity
  // 6. 发送 SSE
}
```

### Step 7：自动决策规则

文件：`src/pipeline/decisions.ts`

```ts
function decideAfterScout(scoutOutput): Decision { /* 评分 ≥ 60 → 通过 */ }
function decideAfterCouncil(verdictOutput): Decision { /* 掌秤裁决 */ }
function decideAfterInspector(reviewOutput): Decision { /* 🔴=0 且 🟡≤3 → 通过 */ }
function decideAfterDeployer(deployOutput): Decision { /* 冒烟测试通过 → 鸣锣 */ }
```

### Step 8：四级自愈

文件：`src/pipeline/recovery.ts` + `src/pipeline/backoff.ts`

```ts
function handleFailure(phase: Phase, error: string): RecoveryAction {
  const failCount = phase.fail_count + 1
  if (failCount === 1) return { level: "L1", action: "retry" }
  if (failCount === 2) return { level: "L2", action: "retry_with_context", context: error }
  if (failCount === 3) return { level: "L3", action: "backoff" }
  return { level: "L4", action: "block" }
}

function calculateBackoffInterval(normalInterval: number, failCount: number): number {
  // 翻倍，上限 120 分钟
  return Math.min(normalInterval * Math.pow(2, failCount - 2), 120 * 60 * 1000)
}
```

### Step 9：流程追溯

文件：`src/pipeline/tracking.ts`

每个关键动作都记录事件：

```ts
function trackTickExecuted(tick: TickResult): void { /* 写入 tick_executed 事件 */ }
function trackAgentCalled(call: CallAgentOptions): void { /* 写入 agent_called 事件 */ }
function trackAgentFailed(error: string, failCount: number): void { /* 写入 agent_failed 事件 */ }
function trackPhaseTransition(from: string, to: string, decision: Decision): void { /* 写入 phase_transition 事件 */ }
```

### Step 10：Agent 活动描述更新

文件：`src/agents/activity.ts`

```ts
function updateActivity(agentId: string, status: string, activity: string, detail?: object): Promise<void>
```

在调用 Agent 前后更新 agents.status 和 agents.activity，供展示网站实时展示。

## 验收标准

- [ ] `tick()` 可手动调用，正确检测"无造物令 → 从物帖池取物帖"
- [ ] `tick()` 可手动调用，正确调用对应阶段的处理器（骨架返回 mock）
- [ ] 阶段流转事务正确（phases + projects 状态一致）
- [ ] 四级自愈逻辑正确（L1 重试 → L2 调整 → L3 降速 → L4 暂停）
- [ ] 指数退避计算正确（20min → 40min → 80min → 120min 上限）
- [ ] 所有追溯事件正确写入 events 表
- [ ] Agent activity 更新正确
- [ ] `pnpm typecheck` 通过

## 参考文档

- `design/流水线设计.md → 编排层详细设计` — tick 流程、阶段交接、自愈、追溯
- `design/流水线设计.md → 调度策略` — 单造物令排队、串行/并行规则
- `design/流水线设计.md → 异常处理与渐进式自愈` — L1-L4 四级响应
- `design/流水线设计.md → 流程追溯` — 事件类型和 detail 结构
- `design/Agent角色体系.md → 活动描述` — Agent 状态气泡内容
