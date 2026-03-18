## ADDED Requirements

### Requirement: 开物局全景图

首页 SHALL 展示开物局全景（SVG 横向长卷），包含前堂（物帖墙 + 过堂）、内坊（画室 + 锻造坊 + 试剑台）、后院（器物坊 + 封存阁）。

8 个局中人 SHALL 在各自位置显示，展示当前 status 和 activity。

#### Scenario: 局中人状态展示
- **WHEN** 游商正在采风
- **THEN** 全景图中游商位置显示 working 状态和"正在为「极简记账」采风"的活动描述

#### Scenario: 空闲状态
- **WHEN** 无造物令在跑
- **THEN** 所有局中人显示 idle 状态和默认活动描述
