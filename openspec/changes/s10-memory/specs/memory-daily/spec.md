## ADDED Requirements

### Requirement: 每日总结

Cron #3 触发时 SHALL 调用 `dailySummary()`：查询今日 agent_logs + events + debates → 按局中人分组 → LLM 生成摘要 → 写入 memory/YYYY-MM-DD.md。

#### Scenario: 有工作的一天
- **WHEN** 今天有造物流活动
- **THEN** 各参与 Agent 的 memory/ 下新增当日摘要文件

#### Scenario: 空闲的一天
- **WHEN** 今天无造物流活动
- **THEN** 不生成摘要文件（或生成简短的"今日无事"）

### Requirement: 重要经验直接提炼

每日总结中如果发现同类问题出现 ≥2 次，SHALL 直接写入 lessons.md 或 patterns.md。

#### Scenario: 重复模式识别
- **WHEN** 今日两次采风都遇到"竞品数据不准"的问题
- **THEN** 游商的 lessons.md 新增"竞品数据需要交叉验证"条目
