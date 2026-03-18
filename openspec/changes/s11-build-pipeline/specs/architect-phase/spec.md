## ADDED Requirements

### Requirement: 绘图阶段处理器

`architect.ts` SHALL：调用画师（传入采风报告 + 裁决书）→ 解析蓝图 → 从蓝图提取任务写入 tasks 表 → 创建产出目录 → 初始化项目。

#### Scenario: 蓝图产出
- **WHEN** tick() 推进绘图阶段
- **THEN** phases.output 写入蓝图，tasks 表新增任务列表，~/.openclaw/products/{slug}/ 目录创建

### Requirement: 产出目录管理

`product-dir.ts` SHALL 创建项目目录（含 .kaiwu/ + src/ + public/），并根据蓝图初始化项目骨架。

#### Scenario: 目录创建
- **WHEN** 绘图完成
- **THEN** ~/.openclaw/products/{slug}/ 存在，含 .kaiwu/blueprint.json 和 .kaiwu/tasks.json
