## ADDED Requirements

### Requirement: 局中人总览页

`/agents` 页面 SHALL 展示 8 个角色卡片（头像 emoji、名号、司职、当前状态、activity）和关系图谱。

#### Scenario: 角色卡片
- **WHEN** 访问 /agents
- **THEN** 显示 8 张卡片，每张含 emoji、名称、司职、状态气泡

#### Scenario: 关系图谱
- **WHEN** 查看关系图谱
- **THEN** 显示角色间关系（说客←宿敌→诤臣 等）

### Requirement: 局中人详情页

`/agents/:id` 页面 SHALL 展示：属性雷达图、战绩统计、成长轨迹、名场面集锦。

#### Scenario: 属性雷达图
- **WHEN** 访问 /agents/youshang
- **THEN** 显示游商的 4 个属性（嗅觉/脚力/见闻/慧眼）雷达图

#### Scenario: 宿敌谱
- **WHEN** 访问 /agents/shuike
- **THEN** 显示说客 vs 诤臣的战绩（胜/负/平）

#### Scenario: 成长轨迹
- **WHEN** 查看局中人详情页
- **THEN** 显示里程碑时间线（首次参与、首次成功、等级提升等）

#### Scenario: 名场面集锦
- **WHEN** 查看局中人详情页
- **THEN** 显示该角色的精彩发言或关键决策片段
