## ADDED Requirements

### Requirement: 复盘触发

SHALL 在造物令 launched 后 7/30/90 天自动触发复盘。

#### Scenario: 7 天复盘
- **WHEN** 器物上线 7 天
- **THEN** 收集数据（HTTP HEAD + 游商回访）→ 对比判断 vs 实际 → 生成复盘志 → 更新属性

### Requirement: 轶事解锁

造物令完成时 SHALL 检查轶事解锁条件。

#### Scenario: 轶事解锁
- **WHEN** 游商连续 3 次采风评分 ≥ 80
- **THEN** 解锁"金鼻子"轶事，写入 events（achievement_unlocked）
