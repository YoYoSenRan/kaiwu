## ADDED Requirements

### Requirement: 采风阶段处理器（异步状态机）

`scout.ts` 的 `advance()` SHALL 按异步状态机模型工作：

**首次调用**（phase.output 为空）：
1. 从 keywords 表读取物帖文本 + 理由 + 预采风数据
2. 组装采风消息
3. 通过 callAgent 分发给游商（不等结果）
4. 返回 `{ status: "in_progress" }`

**后续调用**（phase.output 有值）：
1. 用 scoutReportSchema（Zod）校验报告格式
2. 校验通过 → 返回 `{ status: "completed", output: 报告 }`
3. 校验失败 → 返回 `{ status: "failed", error: "报告格式异常" }`

自动决策由 engine.ts 的 transitionPhase → decideAfterScout 处理（≥60 通过 / <60 封存）。

#### Scenario: 采风成功进入过堂
- **WHEN** 游商返回采风报告，综合评分 72
- **THEN** phases.output 写入报告，造物令进入 council 阶段

#### Scenario: 采风评分不足封存
- **WHEN** 游商返回采风报告，综合评分 45
- **THEN** 造物令状态变为 dead，封存辞用编排层模板（不额外调用游商）

#### Scenario: 采风报告格式异常
- **WHEN** 游商返回的内容不符合 Zod schema
- **THEN** 标记为失败，触发自愈机制（L1 重试）

### Requirement: 采风报告包含项目背景

采风报告 SHALL 包含项目背景书：产品定位、目标用户、核心痛点、产品形态、核心功能、差异化。

#### Scenario: 项目背景完整
- **WHEN** 查看采风报告的 output
- **THEN** 包含 background 对象，含 positioning、targetUser、corePainPoint、productForm、coreFeatures、differentiation 字段

### Requirement: 四维度评分

采风报告 SHALL 包含四维度评分（市场 market、用户需求 userNeed、差异化 differentiation、展示潜力 showcasePotential）和综合评分（0-100），与 scoutReportSchema 一致。

#### Scenario: 评分合理
- **WHEN** 查看采风报告的评分
- **THEN** 各维度分数在 0-100 之间，综合评分为加权平均，不是全 50 或全 100
