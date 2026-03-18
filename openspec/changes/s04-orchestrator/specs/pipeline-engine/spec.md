## ADDED Requirements

### Requirement: tick 主循环

`packages/domain/src/pipeline/engine.ts` 的 `tick()` SHALL 执行以下流程：
1. 检查 Gateway 健康状态
2. 取当前 running 的造物令（同一时间只有一个）
3. 无造物令 → 从物帖池取权重最高的物帖，创建新造物令
4. 有造物令 → 根据当前阶段调用对应的阶段处理器
5. 处理返回结果（成功推进 / 失败自愈）
6. 记录 tick_executed 事件
7. 发送 SSE

#### Scenario: 无造物令时从物帖池取物帖
- **WHEN** tick() 执行且无 running 造物令，物帖池有 pending 物帖
- **THEN** 取权重最高的物帖创建造物令，状态为 scouting

#### Scenario: 物帖池为空
- **WHEN** tick() 执行且无 running 造物令，物帖池为空
- **THEN** tick 正常返回，action 为 "waiting"，不创建造物令

#### Scenario: 有造物令时推进
- **WHEN** tick() 执行且有 running 造物令
- **THEN** 调用对应阶段处理器的 advance()，根据结果推进或处理失败

#### Scenario: Gateway 不健康
- **WHEN** tick() 执行但 Gateway 健康检查失败
- **THEN** 记录 gateway_down 事件，跳过本次 tick

### Requirement: 阶段调度器

`scheduler.ts` SHALL 根据 `projects.current_phase` 分发到对应的阶段处理器（scout/council/architect/builder/inspector/deployer）。

#### Scenario: 正确分发
- **WHEN** 造物令 current_phase 为 "council"
- **THEN** 调用 councilHandler.advance()

### Requirement: 阶段处理器统一接口

每个阶段处理器 SHALL 实现 `PhaseHandler` 接口：`advance(project, phase): Promise<PhaseStepResult>`。本阶段返回 mock 数据。

#### Scenario: 骨架处理器返回 mock
- **WHEN** 调用 scoutHandler.advance()
- **THEN** 返回 `{ status: "completed", output: { mock: true } }`

### Requirement: 72 小时超时

tick() SHALL 检查造物令的 started_at，超过 72 小时自动封存。

#### Scenario: 超时封存
- **WHEN** 造物令 started_at 距今超过 72 小时
- **THEN** 造物令状态更新为 dead，生成封存辞"超时了。也许这个想法太大了。"
