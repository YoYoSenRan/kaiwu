## ADDED Requirements

### Requirement: 8 个局中人初始数据

`packages/db/src/seed.ts` SHALL 包含 8 个局中人的完整初始数据，写入 agents 表。

局中人列表：
- youshang（游商 / 采风使 / 🎒）
- shuike（说客 / 立论使 / 🗣）
- zhengchen（诤臣 / 驳论使 / ⚔️）
- zhangcheng（掌秤 / 裁决使 / ⚖️）
- huashi（画师 / 绘图使 / 🎨）
- jiangren（匠人 / 锻造使 / 🔨）
- shijian（试剑 / 验器使 / 🗡）
- mingluo（鸣锣 / 发布使 / 🔔）

每个局中人 SHALL 包含：id、name、title、emoji、stage_type、personality（JSONB）、status（idle）、activity、level（1）、level_name（初出茅庐）。

数据来源：`design/Agent角色体系.md` + `design/Agent工作区设计/各角色/`

#### Scenario: seed 脚本执行成功
- **WHEN** 执行 seed 脚本
- **THEN** agents 表中存在 8 条记录，字段值与设计文档一致

### Requirement: 局中人初始属性

seed 脚本 SHALL 同时写入每个局中人的初始属性到 agent_stats 表。

每个局中人有 4 个属性，初始值均为 raw_value: 0、star_level: 1、sample_size: 0。

属性来源：`design/角色属性系统.md → 各角色属性`

#### Scenario: 初始属性写入
- **WHEN** 执行 seed 脚本
- **THEN** agent_stats 表中存在 32 条记录（8 个角色 × 4 个属性），star_level 均为 1

### Requirement: seed 脚本幂等

seed 脚本 SHALL 支持重复执行（upsert），不会因重复运行而报错或产生重复数据。

#### Scenario: 重复执行不报错
- **WHEN** 连续执行 seed 脚本两次
- **THEN** 第二次执行成功，agents 表仍为 8 条记录，agent_stats 表仍为 32 条记录
