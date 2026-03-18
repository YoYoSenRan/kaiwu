## ADDED Requirements

### Requirement: 过堂直播组件

首页和造物志详情页 SHALL 包含过堂直播组件，实时显示辩论进程。

#### Scenario: 实时辩论
- **WHEN** 过堂正在进行
- **THEN** 说客和诤臣的发言以气泡形式实时出现（SSE 推送）

#### Scenario: 局势条实时更新
- **WHEN** 每轮辩论结束
- **THEN** 局势条动画更新，显示双方得分变化

#### Scenario: 裁决特殊样式
- **WHEN** 掌秤裁决出现
- **THEN** 以印章 + 金边特殊样式展示
