## 1. 事件系统（已在 s03 创建骨架，本阶段补充 emitter 逻辑）

- [ ] 1.1 完善 `packages/domain/src/events/emitter.ts`：emitEvent() 写入 events 表 + publish 到 bus — 验收：调用后 events 表有记录且 subscriber 收到

## 2. Agent 调用

- [ ] 2.1 创建 `packages/domain/src/agents/caller.ts`：callAgent()（Gateway API isolated session + 超时处理）— 验收：可调用 Agent 并获取返回
- [ ] 2.2 创建 `packages/domain/src/agents/activity.ts`：updateActivity()（更新 agents 表 status/activity/activity_detail）— 验收：调用后 agents 表字段更新
- [ ] 2.3 创建 `packages/domain/src/agents/stats.ts`：属性计算框架（骨架，具体公式后续填充）— 验收：typecheck 通过

## 3. 造物流引擎

- [ ] 3.1 创建 `packages/domain/src/pipeline/engine.ts`：tick() 主循环 — 验收：手动调用可正确检测造物令状态
- [ ] 3.2 创建 `packages/domain/src/pipeline/scheduler.ts`：阶段调度器（根据 current_phase 分发）— 验收：正确分发到对应处理器

## 4. 阶段处理器（骨架）

- [ ] 4.1 创建 `packages/domain/src/pipeline/phases/scout.ts`：采风骨架（返回 mock）— 验收：advance() 返回 PhaseStepResult
- [ ] 4.2 创建 `packages/domain/src/pipeline/phases/council.ts`：过堂骨架 — 验收：同上
- [ ] 4.3 创建 `packages/domain/src/pipeline/phases/architect.ts`：绘图骨架 — 验收：同上
- [ ] 4.4 创建 `packages/domain/src/pipeline/phases/builder.ts`：锻造骨架 — 验收：同上
- [ ] 4.5 创建 `packages/domain/src/pipeline/phases/inspector.ts`：试剑骨架 — 验收：同上
- [ ] 4.6 创建 `packages/domain/src/pipeline/phases/deployer.ts`：鸣锣骨架 — 验收：同上

## 5. 阶段流转与决策

- [ ] 5.1 创建 `packages/domain/src/pipeline/transitions.ts`：transitionPhase()（事务内状态变更 + 事件写入）— 验收：事务内 phases + projects 状态一致
- [ ] 5.2 创建 `packages/domain/src/pipeline/decisions.ts`：4 个决策函数（decideAfterScout/Council/Inspector/Deployer）— 验收：各阈值判断正确

## 6. 自愈与退避

- [ ] 6.1 创建 `packages/domain/src/pipeline/recovery.ts`：handleFailure()（L1-L4 四级响应）— 验收：根据 failCount 返回正确级别
- [ ] 6.2 创建 `packages/domain/src/pipeline/backoff.ts`：calculateBackoffInterval()（指数退避，上限 120 分钟）— 验收：计算结果正确

## 7. 流程追溯

- [ ] 7.1 创建 `packages/domain/src/pipeline/tracking.ts`：trackTickExecuted / trackAgentCalled / trackAgentFailed / trackPhaseTransition 等 — 验收：各事件正确写入 events 表

## 8. 导出与验证

- [ ] 8.1 更新 `packages/domain/src/index.ts`：barrel 导出 pipeline + agents + events — 验收：外部 package 可 import
- [ ] 8.2 tick() 手动调用端到端测试（无造物令 → 取物帖 → 创建造物令 → 调用骨架处理器）— 验收：流程正确
- [ ] 8.3 `pnpm typecheck` 通过
