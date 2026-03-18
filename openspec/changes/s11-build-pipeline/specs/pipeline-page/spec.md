## ADDED Requirements

### Requirement: 造物坊页面

`/pipeline` 页面 SHALL 展示：看板（6 阶段泳道 + 当前造物令位置）、漏斗数据（物帖→采风通过→过堂通过→开物）、更鼓时间线。

#### Scenario: 看板展示
- **WHEN** 访问 /pipeline
- **THEN** 显示 6 阶段泳道，当前造物令在对应阶段高亮

#### Scenario: 漏斗数据
- **WHEN** 查看漏斗
- **THEN** 显示各阶段的通过率统计
