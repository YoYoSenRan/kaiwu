## ADDED Requirements

### Requirement: 采风阶段处理器

`scout.ts` 的 `advance()` SHALL：
1. 组装消息（物帖文本 + 理由 + 预采风数据）
2. 通过 callAgent 调用游商
3. 用 Zod 校验采风报告格式
4. 写入 phases.output
5. 执行自动决策（≥60 通过 / <60 封存）

#### Scenario: 采风成功进入过堂
- **WHEN** 游商返回采风报告，综合评分 72
- **THEN** phases.output 写入报告，造物令进入 council 阶段

#### Scenario: 采风评分不足封存
- **WHEN** 游商返回采风报告，综合评分 45
- **THEN** 造物令状态变为 dead，额外调用游商生成封存辞

#### Scenario: 采风报告格式异常
- **WHEN** 游商返回的内容不符合 Zod schema
- **THEN** 标记为失败，触发自愈机制（L1 重试）

### Requirement: 采风报告包含项目背景

采风报告 SHALL 包含项目背景书：产品定位、目标用户、核心痛点、产品形态、核心功能、差异化。

#### Scenario: 项目背景完整
- **WHEN** 查看采风报告的 output
- **THEN** 包含 background 对象，含 positioning、targetUser、corePainPoint、productForm、coreFeatures、differentiation 字段

### Requirement: 四维度评分

采风报告 SHALL 包含四维度评分（市场规模、竞争程度、用户痛点、差异化空间、展示潜力）和综合评分（0-100）。

#### Scenario: 评分合理
- **WHEN** 查看采风报告的评分
- **THEN** 各维度分数在 0-100 之间，综合评分为加权平均，不是全 50 或全 100
