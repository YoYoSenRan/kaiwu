## ADDED Requirements

### Requirement: 过堂辩论串行调度

`council.ts` 的 `advance()` SHALL 每次 tick 推进一整轮：先调用说客，再调用诤臣（传入说客本轮发言）。辩论记录写入 debates 表。

#### Scenario: 第一轮辩论
- **WHEN** tick() 推进过堂第 1 轮
- **THEN** 说客基于采风报告发言，诤臣针对说客论点反驳，两条记录写入 debates 表

#### Scenario: 掌秤裁决
- **WHEN** 辩论轮次结束（3-4 轮后）
- **THEN** 下一次 tick 调用掌秤，裁决书写入 phases.output

#### Scenario: 裁决通过
- **WHEN** 掌秤裁决"通过"
- **THEN** 造物令进入 architect 阶段

#### Scenario: 裁决否决
- **WHEN** 掌秤裁决"否决"
- **THEN** 造物令状态变为 dead，掌秤撰写封存辞

### Requirement: 局势条计算

`situation.ts` SHALL 每轮辩论后调用 LLM 评估双方论点，输出 shuikeScore（0-100）/ zhengchenScore（0-100）/ reason。

#### Scenario: 局势变化
- **WHEN** 诤臣在第 2 轮提出有力反驳
- **THEN** zhengchenScore 上升，shuikeScore 下降，reason 说明原因
