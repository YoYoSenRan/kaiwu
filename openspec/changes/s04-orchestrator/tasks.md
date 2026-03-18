## 1. 事件系统

- [x] 1.1 ~~完善 emitter.ts~~ — s03 已完整实现 emitEvent()（写 events 表 + publish 到 bus），无需补充

## 2. 常量与类型

- [ ] 2.1 创建 `packages/domain/src/pipeline/constants.ts`：PHASE_STATUS / PROJECT_STATUS / PHASE_TYPE 常量枚举 — 验收：typecheck 通过
- [ ] 2.2 创建 `packages/domain/src/pipeline/types.ts`：PhaseHandler 接口 + PhaseStepResult 类型（status: completed | in_progress | failed） + TickResult 类型 — 验收：typecheck 通过

## 3. Agent 调用（异步状态机）

- [ ] 3.1 创建 `packages/openclaw/src/gateway-client.ts`：封装 cron job 管理 — 验收：dispatchAgentTask 可创建 one-shot job，getJobStatus 可查询状态，checkProviderHealth 可检查可用性
- [ ] 3.2 创建 `packages/domain/src/agents/caller.ts`：callAgent()（通过 gateway-client.dispatchAgentTask 创建 isolated cron job，不同步等待）— 验收：调用后 cron job 已创建
- [ ] 3.3 创建 `packages/domain/src/agents/activity.ts`：updateActivity()（更新 agents 表 status/activity/activity_detail）— 验收：调用后 agents 表字段更新
- [ ] 3.4 创建 `packages/domain/src/agents/stats.ts`：属性计算框架（骨架，具体公式后续填充）— 验收：typecheck 通过

## 4. 造物流引擎

- [ ] 4.1 创建 `packages/domain/src/pipeline/engine.ts`：tick() 异步状态机主循环（检查 phase 状态 → 分发/收结果/决策）— 验收：手动调用可正确检测造物令状态
- [ ] 4.2 创建 `packages/domain/src/pipeline/scheduler.ts`：阶段调度器（根据 current_phase 分发到对应 PhaseHandler）— 验收：正确分发到对应处理器
- [ ] 4.3 创建 `packages/domain/src/pipeline/stale-detector.ts`：stale 检测（阈值 = getCronInterval(phaseType) × STALE_MULTIPLIER，从 cron 配置实时派生，不硬编码）— 验收：调整 cron 间隔后阈值自动跟随

## 5. 阶段处理器（骨架）

- [ ] 5.1 创建 `packages/domain/src/pipeline/phases/scout.ts`：采风骨架（返回 { status: "completed", output: { mock: true } }）— 验收：advance() 返回 PhaseStepResult
- [ ] 5.2 创建 `packages/domain/src/pipeline/phases/council.ts`：过堂骨架 — 验收：同上
- [ ] 5.3 创建 `packages/domain/src/pipeline/phases/architect.ts`：绘图骨架 — 验收：同上
- [ ] 5.4 创建 `packages/domain/src/pipeline/phases/builder.ts`：锻造骨架 — 验收：同上
- [ ] 5.5 创建 `packages/domain/src/pipeline/phases/inspector.ts`：试剑骨架 — 验收：同上
- [ ] 5.6 创建 `packages/domain/src/pipeline/phases/deployer.ts`：鸣锣骨架 — 验收：同上

## 6. 阶段流转与决策

- [ ] 6.1 创建 `packages/domain/src/pipeline/transitions.ts`：transitionPhase()（事务内状态变更 + 事件写入）— 验收：事务内 phases + projects 状态一致
- [ ] 6.2 创建 `packages/domain/src/pipeline/decisions.ts`：4 个决策函数（decideAfterScout/Council/Inspector/Deployer）— 验收：各阈值判断正确
- [ ] 6.3 创建 `packages/domain/src/pipeline/epitaphs.ts`：封存辞模板（5 种封存场景各一个模板）— 验收：各场景返回正确封存辞

## 7. 自愈与退避

- [ ] 7.1 创建 `packages/domain/src/pipeline/recovery.ts`：handleFailure()（L1-L4 四级响应）— 验收：根据 failCount 返回正确级别
- [ ] 7.2 创建 `packages/domain/src/pipeline/backoff.ts`：calculateBackoffInterval()（指数退避，上限 120 分钟）— 验收：计算结果正确

## 8. 流程追溯

- [ ] 8.1 创建 `packages/domain/src/pipeline/tracking.ts`：trackTickExecuted / trackAgentDispatched / trackAgentCompleted / trackAgentFailed / trackPhaseTransition / trackProviderDown 等 — 验收：各事件正确写入 events 表

## 9. 导出与验证

- [ ] 9.1 更新 `packages/domain/src/index.ts`：barrel 导出 pipeline + agents — 验收：外部 package 可 import
- [ ] 9.2 tick() 手动调用端到端测试（无造物令 → 取物帖 → 创建造物令 → 分发骨架任务 → 模拟产出写入 → 下次 tick 收结果推进）— 验收：两轮 tick 完成一个阶段
- [ ] 9.3 `pnpm typecheck` 通过
