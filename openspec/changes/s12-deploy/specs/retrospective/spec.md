## ADDED Requirements

### Requirement: 复盘触发

SHALL 在造物令 launched 后 7/30/90 天自动触发复盘。

#### Scenario: 7 天复盘
- **WHEN** 器物上线 7 天
- **THEN** 收集数据（HTTP HEAD + 游商回访）→ 对比判断 vs 实际 → 生成复盘志 → 更新属性

### Requirement: 轶事解锁

造物令完成时 SHALL 检查轶事解锁条件。

#### Scenario: 轶事解锁
- **WHEN** 游商连续 3 次采风评分与最终结果偏差 < 10 分
- **THEN** 解锁"千里眼"轶事，写入 events（achievement_unlocked）+ MEMORY.md

### Requirement: 复盘由 tick 驱动

复盘 SHALL 嵌入编排层的 tick() 中：每次更鼓时检查是否有 launched 项目到达 7/30/90 天复盘节点。

#### Scenario: 复盘触发
- **WHEN** tick() 执行且某器物上线已满 7 天
- **THEN** 触发该器物的 7 天复盘流程

### Requirement: 宿敌谱写入 relationships.md

造物令完成时 SHALL 更新说客和诤臣的 `memory/relationships.md`，记录本次过堂的战绩（胜/负/平）、强项/弱项、最近趋势、下次策略建议。

#### Scenario: 宿敌谱更新
- **WHEN** 造物令完成（launched 或 dead）
- **THEN** 说客和诤臣的 relationships.md 新增本次过堂的战绩记录
