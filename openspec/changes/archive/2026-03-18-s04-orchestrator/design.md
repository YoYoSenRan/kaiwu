## Context

数据库和 API 层已就位，OpenClaw Gateway 已配置。本阶段实现造物流的核心引擎，让更鼓 Cron 触发时可以自动推进造物令。

编排层设计已在 `design/流水线设计.md → 编排层详细设计` 中完整定义，包括 tick 流程、调度策略、自愈机制、追溯事件。

## Goals / Non-Goals

**Goals:**

- tick() 可手动调用，正确检测造物令状态并推进
- 阶段流转事务正确（phases + projects 状态一致）
- 四级自愈逻辑正确（L1 重试 → L2 调整 → L3 降速 → L4 暂停）
- 所有追溯事件正确写入 events 表
- Agent 调用封装可通过 cron one-shot job 创建 isolated session

**Non-Goals:**

- 各阶段处理器只实现骨架（mock），具体逻辑在后续模块填充（s07-游商采风、s08-过堂辩论等）
- 不实现复盘触发（属于 s12-鸣锣部署）
- 不实现属性计算的完整公式（属于后续模块，本阶段只搭框架）

## Decisions

### D1: 自建轻量状态机

设计文档指定。阶段数固定（6 个），不需要动态编排。自建比引入重型工作流引擎更灵活。

### D2: 阶段处理器统一接口

所有阶段实现 `PhaseHandler.advance(project, phase): PhaseStepResult`。本阶段只实现骨架返回 mock，后续模块逐个填充。这样编排层骨架可以独立验证。

### D3: 任务指令通过 cron one-shot job 传递

不写 HEARTBEAT.md。编排层通过 OpenClaw cron API 创建 one-shot isolated job 给目标 Agent，任务指令作为 job 的 message payload 传递。HEARTBEAT.md 仅保留为 Agent 的行为规则参考文档。

### D4: EventBus 在 packages/domain

EventBus（bus.ts + emitter.ts）已在 s03 中定义于 `packages/domain/src/events/`。编排层直接使用 emitEvent() 写入事件。

### D5: 单造物令排队

同一时间只有一个造物令在跑。设计文档明确了这个策略及其理由（注意力集中、叙事线清晰、零并发风险）。

### D6: 异步状态机——tick 不等 Agent

**背景**：流水线设计.md 描述的是同步模型（tick → 调 Agent → 等产出 → 决策）。但编排层 tick 运行在 cron isolated session 中，OpenClaw 没有公开的"在 Plugin 内部触发另一个 Agent turn 并同步等结果"的 API。Gateway 协议是 WebSocket，不是 REST。

**方案**：tick 采用**异步状态机**模型。tick 不等 Agent 完成，只做"检查状态 + 分发任务 + 收结果"三种动作。Agent 产出通过 tool call（submit_scout_report 等）自动写入 DB。

单个阶段的推进节奏：

```
tick N:   phase.output 为空 → 创建 cron one-shot job 给目标 Agent
          → phase.status 设为 in_progress
          → 返回 { status: "in_progress", action: "agent_dispatched" }

tick N+1: phase.output 已有值 → 执行决策规则 → 流转到下一阶段
          → 返回 { status: "completed", action: "advanced" }
```

**优点**：
- 零依赖风险——只用 OpenClaw 公开 API（cron add/list/runs）
- tick 秒级完成，不卡住 cron session
- 天然幂等——任何时候挂了重启，从 DB 状态继续
- Agent 超时不阻塞编排层——超时由 cron job 自身 timeoutSeconds 管理

**缺点与缓解**：
- 一个阶段至少 2 次 tick（发任务 + 收结果）。过堂一轮需要 3 次 tick（调说客 → 调诤臣 → 确认）。→ 通过 phaseOverrides 缩短过堂间隔（5 分钟），一轮 15 分钟，可接受且有"辩论节奏感"
- 失去同步模型的简洁性。→ 状态全在 DB 中，逻辑清晰可测试

**tick 状态机流程**：

```
tick()
  │
  ├── 1. 检查 LLM provider 可用性（见 D9）
  │
  ├── 2. 查 running 造物令
  │     └── 无 → 取物帖 → 创建造物令 → 创建 scout phase → 分发游商任务
  │
  ├── 3. 检查 72 小时超时
  │
  ├── 4. 检查当前 phase 状态：
  │     ├── pending → 分发 Agent 任务（创建 cron job），标记 in_progress
  │     ├── in_progress → 检查 Agent 是否已产出（查 phase.output / debates / tasks）
  │     │   ├── 有产出 → 执行决策规则 → 流转或封存
  │     │   ├── 无产出且未超时 → 跳过，等下次 tick
  │     │   └── 无产出且超时 → 标记 failed，触发自愈
  │     ├── failed → handleFailure()（L1-L4）
  │     └── blocked → 检查是否可恢复
  │
  ├── 5. 记录 tick_executed 事件
  │
  └── 6. SSE 推送
```

**gateway-client 封装**：`packages/openclaw/src/gateway-client.ts` 封装 cron job 管理：
- `dispatchAgentTask(agentId, message, opts?)` — 创建 one-shot isolated cron job
- `getJobStatus(jobId)` — 查询 job 运行状态
- `checkProviderHealth()` — 轻量 LLM provider 健康检查

### D7: 状态枚举定义

在 `packages/domain/src/pipeline/constants.ts` 中定义编排层用到的所有状态和类型常量：

```ts
export const PHASE_STATUS = { PENDING: "pending", IN_PROGRESS: "in_progress", COMPLETED: "completed", FAILED: "failed", BLOCKED: "blocked" } as const
export const PROJECT_STATUS = { RUNNING: "running", LAUNCHED: "launched", DEAD: "dead", BLOCKED: "blocked" } as const
export const PHASE_TYPE = { SCOUT: "scout", COUNCIL: "council", ARCHITECT: "architect", BUILDER: "builder", INSPECTOR: "inspector", DEPLOYER: "deployer" } as const
```

DB 层用 varchar 保持灵活，domain 层通过 const 枚举约束。

### D8: PhaseStepResult 支持多步进展

`PhaseStepResult.status` 支持三种状态：
- `"completed"` — 阶段产出已就绪，可以执行决策规则流转到下一阶段
- `"in_progress"` — 本次 tick 有进展但阶段未完成（锻造多任务、过堂多轮）
- `"failed"` — 本次执行失败，触发自愈机制

骨架处理器默认返回 `{ status: "completed", output: { mock: true } }`。后续模块（如 s07 采风一步完成、s08 过堂多步）各自实现具体逻辑。

### D9: 健康检查是 LLM provider 可用性，不是 Gateway

tick 运行在 Gateway 的 cron session 里。Gateway 挂了 → cron 不触发 → tick 根本不会执行。所以 tick 开头的健康检查不是检查 Gateway 本身，而是检查 **LLM provider 可用性**（Agent 调用需要 LLM）。

- `checkProviderHealth()`：轻量 API call 或读 Gateway 内部状态
- 不可用 → 记录 `provider_down` 事件，跳过本次 tick（不标记 blocked，因为是瞬态问题）
- 连续 N 次 provider_down → 标记造物令 blocked（L4）

### D10: stale 检测——阈值从 cron 配置派生

流水线设计.md 定义"超过 2 个更鼓周期无产出"为 stale。关键设计点：**阈值不能硬编码**——cron 间隔按阶段不同（过堂 5min vs 采风 10min），且用户可能动态调整。如果阈值是固定 40 分钟，改了间隔后要么误判、要么漏判。

方案：`stale 阈值 = 当前阶段 cron 间隔 × STALE_MULTIPLIER`。只维护一个倍数常量，阈值自动跟随 cron 配置变化。

```ts
const STALE_MULTIPLIER = 3  // 3 个 tick 周期无产出 → stale

function getStaleThreshold(phaseType: string): number {
  const interval = getCronInterval(phaseType)  // 从 cron 配置实时读取
  return interval * STALE_MULTIPLIER
}
```

判断逻辑：查 events 表最近一条 `agent_dispatched` 的时间，距今超过阈值且 phase.output 仍为空 → 判定 stale。

联动场景：
- 正常：间隔 10min → 阈值 30min
- L3 退避后间隔翻倍 20min → 阈值自动放宽 60min（不会因退避反而更容易误判）
- 用户动态调长间隔 → 阈值自动跟随，不误判
- 用户动态调短间隔 → 阈值自动收紧，但不会短于 Agent 正常完成时间（STALE_MULTIPLIER=3 保证至少 3 个周期的容忍度）

### D11: 封存辞生成异步化

流水线设计.md 说"采风评分 < 60 时，额外调用游商生成封存辞"。但异步模型下 tick 不等 Agent 结果。

方案：采风评分 < 60 时，编排层自己用固定模板生成封存辞（与其他封存场景一致），不额外调用游商。

| 封存原因 | 封存辞来源 | 说明 |
|----------|-----------|------|
| 采风评分 < 60 | 编排层模板 | "市场尚未准备好。也许换个时机。"（可从采风报告 privateNote 提取） |
| 掌秤否决 | 裁决书 epitaph 字段 | 掌秤在裁决时已写好 |
| 试剑 3 轮不通过 | 编排层模板 | "三次回炉仍未达标。此器暂封。" |
| 72 小时超时 | 编排层模板 | "超时了。也许这个想法太大了。" |
| L4 暂停 24h | 编排层模板 | "造物流中断。局中人遇到了意料之外的困难。" |

后续打磨阶段可改为调用 LLM 生成更有个性的封存辞，但 MVP 不依赖额外 Agent 调用。

### D12: 过堂局势条在 tick 内同步计算

s08 设计要求"每轮辩论结束后调用 LLM 评估双方论点强度"。局势条计算不需要 Agent session，只需调 LLM API。

方案：tick 检测到诤臣第 N 轮发言已写入 → 在 tick 内同步调 LLM 评估 → 写入 DB。这是纯计算，几秒完成，不需要 isolated session。

```
tick 检测到本轮辩论完成（说客+诤臣都发言了）
  → 调 LLM：给定双方论点，评估 shuikeScore / zhengchenScore / reason
  → 写入 debates 表或独立的 situation_scores 表
  → 返回 in_progress（等下轮或等掌秤裁决）
```

## Risks / Trade-offs

- **骨架阶段处理器**：返回 mock 数据，无法端到端验证。→ 通过单元测试验证 tick 流程和状态流转逻辑，具体 Agent 交互在后续模块集成测试。
- **异步模型的延迟**：一个阶段至少 2 次 tick。过堂一轮 3 次 tick × 5 分钟间隔 = 15 分钟。→ 可接受，且对展示网站来说有"辩论节奏感"。
- **72 小时超时**：单造物令超时自动封存。→ 在 tick 中检查 started_at，超时则走封存流程。
- **cron job 可靠性**：dispatchAgentTask 创建的 one-shot job 可能失败或超时。→ 下次 tick 检测到 phase.output 仍为空时，视为 failed，进入自愈流程。不需要额外的 job 状态监控。
- **未来迁移到同步模型**：如果 OpenClaw 后续开放 Plugin 内部调用 Agent 的 API，可以平滑迁移——只改 agent caller 实现，tick 状态机逻辑不变。
