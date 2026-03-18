## ADDED Requirements

### Requirement: 阶段流转事务原子性

`transitions.ts` 的 `transitionPhase()` SHALL 在数据库事务内完成：
1. 更新 phases.status = completed + output + completed_at
2. 执行决策规则（通过 → 创建下一阶段 / 封存 → 更新 projects.status = dead）
3. 更新 projects.current_phase
4. 写入 phase_transition 事件

事务外：更新 Agent activity + 发送 SSE。

#### Scenario: 通过决策
- **WHEN** 采风评分 ≥ 60
- **THEN** 事务内创建 council 阶段记录，projects.current_phase 更新为 council

#### Scenario: 封存决策
- **WHEN** 采风评分 < 60
- **THEN** 事务内 projects.status 更新为 dead，写入封存事件

#### Scenario: 事务回滚
- **WHEN** 事务内任一步骤失败
- **THEN** 所有变更回滚，数据库状态不变

### Requirement: 自动决策规则

`decisions.ts` SHALL 实现以下决策函数：
- `decideAfterScout`：评分 ≥ 60 → 通过，< 60 → 封存
- `decideAfterCouncil`：掌秤裁决"通过" → 进入绘图，"否决" → 封存
- `decideAfterInspector`：🔴=0 且 🟡≤3 → 通过，否则回退锻造（最多 3 轮）
- `decideAfterDeployer`：冒烟测试通过 → 鸣锣，失败 → 回滚回退审查

#### Scenario: 采风通过
- **WHEN** scoutOutput.overallScore = 72
- **THEN** decideAfterScout 返回 { action: "advance", nextPhase: "council" }

#### Scenario: 试剑回退
- **WHEN** reviewOutput 有 1 个 🔴 严重问题
- **THEN** decideAfterInspector 返回 { action: "rollback", targetPhase: "builder" }

#### Scenario: 试剑 3 轮失败封存
- **WHEN** 试剑第 3 轮仍不通过
- **THEN** decideAfterInspector 返回 { action: "seal", reason: "3轮修复失败" }
