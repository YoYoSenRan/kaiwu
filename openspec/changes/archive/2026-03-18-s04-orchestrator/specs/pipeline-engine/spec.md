## ADDED Requirements

### Requirement: tick 异步状态机

`packages/domain/src/pipeline/engine.ts` 的 `tick()` SHALL 实现异步状态机模型——不同步等待 Agent 完成，只做"检查状态 + 分发任务 + 收结果"。

tick() 流程：
1. 检查 LLM provider 可用性（非 Gateway 健康检查——tick 运行在 Gateway 内，Gateway 挂了 tick 不会触发）
2. 取当前 running 的造物令（同一时间只有一个）
3. 无造物令 → 从物帖池取权重最高的物帖，创建新造物令
4. 有造物令 → 检查 72 小时超时
5. 根据 phase.status 决定动作：
   - pending → 分发 Agent 任务（创建 cron one-shot job），标记 in_progress
   - in_progress → 检查是否有产出 → 有则决策流转，无则等下次 tick 或判定 stale
   - failed → 触发自愈（L1-L4）
   - blocked → 检查是否可恢复
6. 记录 tick_executed 事件
7. 发送 SSE

tick() 返回 `Promise<TickResult>`（单造物令，非数组）。

#### Scenario: 无造物令时从物帖池取物帖
- **WHEN** tick() 执行且无 running 造物令，物帖池有 pending 物帖
- **THEN** 取权重最高的物帖创建造物令，projects.status 为 running，current_phase 为 scout

#### Scenario: 物帖池为空
- **WHEN** tick() 执行且无 running 造物令，物帖池为空
- **THEN** tick 正常返回，action 为 "waiting"，不创建造物令

#### Scenario: 分发 Agent 任务
- **WHEN** tick() 检测到 phase.status 为 pending
- **THEN** 通过 gateway-client.dispatchAgentTask() 创建 cron one-shot job，phase.status 更新为 in_progress

#### Scenario: 收到 Agent 产出后推进
- **WHEN** tick() 检测到 phase.status 为 in_progress 且 phase.output 已有值
- **THEN** 执行决策规则，流转到下一阶段或封存

#### Scenario: Agent 未产出，继续等待
- **WHEN** tick() 检测到 phase.status 为 in_progress 且 phase.output 为空且未超时
- **THEN** 返回 { action: "waiting" }，不做任何操作

#### Scenario: LLM provider 不可用
- **WHEN** tick() 执行但 checkProviderHealth() 失败
- **THEN** 记录 provider_down 事件，跳过本次 tick。连续 N 次失败后标记造物令 blocked（L4）

### Requirement: 阶段调度器

`scheduler.ts` SHALL 根据 `projects.current_phase` 分发到对应的阶段处理器（scout/council/architect/builder/inspector/deployer）。

#### Scenario: 正确分发
- **WHEN** 造物令 current_phase 为 "council"
- **THEN** 调用 councilHandler.advance()

### Requirement: 阶段处理器统一接口

每个阶段处理器 SHALL 实现 `PhaseHandler` 接口：`advance(project, phase): Promise<PhaseStepResult>`。

`PhaseStepResult.status` SHALL 支持三种状态：
- `"completed"` — 阶段产出已就绪，触发决策规则流转
- `"in_progress"` — 本次 tick 有进展但阶段未完成（如过堂多轮、锻造多任务）
- `"failed"` — 本次执行失败，触发自愈机制

本阶段骨架处理器返回 mock 数据，后续模块各自实现具体逻辑。

#### Scenario: 骨架处理器返回 mock
- **WHEN** 调用 scoutHandler.advance()
- **THEN** 返回 `{ status: "completed", output: { mock: true } }`

#### Scenario: 多步阶段返回 in_progress
- **WHEN** 过堂第 1 轮结束但未到裁决
- **THEN** advance() 返回 `{ status: "in_progress" }`，下次 tick 继续推进

### Requirement: stale 检测（动态阈值）

`stale-detector.ts` SHALL 通过以下逻辑判断是否 stale：
1. 查 events 表最近一条 `agent_dispatched` 事件时间
2. 计算阈值：`getCronInterval(phase.type) × STALE_MULTIPLIER`（STALE_MULTIPLIER 默认 3）
3. 距今超过阈值且 phase.output 仍为空 → 判定 stale，phase.status 更新为 failed

阈值从 cron 配置实时派生，不硬编码。用户调整 cron 间隔或 L3 退避改变间隔后，阈值自动跟随。

#### Scenario: 采风阶段 stale（间隔 10min）
- **WHEN** phase.type=scout，cron 间隔 10min，最近 agent_dispatched 距今 35 分钟，phase.output 为空
- **THEN** 阈值 = 10 × 3 = 30min，35 > 30 → stale，phase.status 更新为 failed，failCount +1

#### Scenario: 过堂阶段不误判（间隔 5min）
- **WHEN** phase.type=council，cron 间隔 5min，最近 agent_dispatched 距今 12 分钟，phase.output 为空
- **THEN** 阈值 = 5 × 3 = 15min，12 < 15 → 不 stale，跳过

#### Scenario: L3 退避后阈值自动放宽
- **WHEN** 采风间隔从 10min 退避到 20min，最近 agent_dispatched 距今 45 分钟
- **THEN** 阈值 = 20 × 3 = 60min，45 < 60 → 不 stale ✓ 不因退避误判

#### Scenario: 动态调整间隔后阈值跟随
- **WHEN** 用户把过堂间隔从 5min 改为 15min，最近 agent_dispatched 距今 40 分钟
- **THEN** 阈值 = 15 × 3 = 45min，40 < 45 → 不 stale ✓ 不因调整误判

### Requirement: 72 小时超时

tick() SHALL 检查造物令的 started_at，超过 72 小时自动封存。

#### Scenario: 超时封存
- **WHEN** 造物令 started_at 距今超过 72 小时
- **THEN** 造物令状态更新为 dead，封存辞 "超时了。也许这个想法太大了。"

### Requirement: 封存辞模板

`epitaphs.ts` SHALL 为每种封存场景提供固定模板（MVP 不额外调用 Agent 生成）：
- 采风评分 < 60："市场尚未准备好。也许换个时机。"
- 掌秤否决：使用裁决书的 epitaph 字段
- 试剑 3 轮不通过："三次回炉仍未达标。此器暂封。"
- 72 小时超时："超时了。也许这个想法太大了。"
- L4 暂停 24h："造物流中断。局中人遇到了意料之外的困难。"
