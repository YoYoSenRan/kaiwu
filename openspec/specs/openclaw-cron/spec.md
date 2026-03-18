## ADDED Requirements

### Requirement: 造物流更鼓 Cron

SHALL 注册名为"造物流更鼓"的 Cron Job：
- 间隔：`*/20 * * * *`（每 20 分钟）
- 时区：Asia/Shanghai
- 会话模式：isolated
- 模式：--no-deliver（由编排层接管）

#### Scenario: Cron 已注册
- **WHEN** 执行 `openclaw cron list`
- **THEN** 列表中包含"造物流更鼓"，间隔为 */20 * * * *

### Requirement: 游商巡视 Cron

SHALL 注册名为"游商巡视"的 Cron Job：
- 间隔：`0 */2 * * *`（每 2 小时）
- 时区：Asia/Shanghai
- 会话模式：isolated
- 指定 Agent：youshang

#### Scenario: Cron 已注册
- **WHEN** 执行 `openclaw cron list`
- **THEN** 列表中包含"游商巡视"，间隔为 0 */2 * * *

### Requirement: 每日总结 Cron

SHALL 注册名为"每日总结"的 Cron Job：
- 间隔：`0 23 * * *`（每天 23:00）
- 时区：Asia/Shanghai
- 会话模式：isolated

#### Scenario: Cron 已注册
- **WHEN** 执行 `openclaw cron list`
- **THEN** 列表中包含"每日总结"，间隔为 0 23 * * *
