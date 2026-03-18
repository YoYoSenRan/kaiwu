## ADDED Requirements

### Requirement: 四级自愈

`recovery.ts` SHALL 根据 phase.fail_count 返回对应级别的恢复动作：
- L1（fail_count=1）：立即重试
- L2（fail_count=2）：重试并附加错误上下文
- L3（fail_count=3）：指数退避降速
- L4（fail_count≥4）：暂停造物令，等待人工介入

#### Scenario: L1 立即重试
- **WHEN** 阶段第 1 次失败
- **THEN** 返回 { level: "L1", action: "retry" }

#### Scenario: L3 降速
- **WHEN** 阶段第 3 次失败
- **THEN** 返回 { level: "L3", action: "backoff" }，触发指数退避

#### Scenario: L4 暂停
- **WHEN** 阶段第 4 次失败
- **THEN** 返回 { level: "L4", action: "block" }，造物令标记为 blocked

### Requirement: 指数退避

`backoff.ts` SHALL 计算退避间隔：正常间隔 × 2^(failCount-2)，上限 120 分钟。

#### Scenario: 退避计算
- **WHEN** 正常间隔 20 分钟，failCount=3
- **THEN** 退避间隔 = 20 × 2^1 = 40 分钟

#### Scenario: 退避上限
- **WHEN** 正常间隔 20 分钟，failCount=6
- **THEN** 退避间隔 = 120 分钟（上限）
