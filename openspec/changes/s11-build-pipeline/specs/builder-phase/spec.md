## ADDED Requirements

### Requirement: 锻造分步调度

`builder.ts` SHALL 分步推进：Step 1 搭骨架 → Step 2-N 逐区块实现（形→色→动）→ 最后整体打磨。每步完成后触发试剑轻检。

#### Scenario: 分步锻造
- **WHEN** tick() 推进锻造阶段
- **THEN** 按任务依赖顺序分配给匠人，每步完成后试剑轻检

#### Scenario: 轻检反馈修复
- **WHEN** 试剑轻检发现问题
- **THEN** 匠人当场修复，不走正式回炉流程

### Requirement: 试剑全检

`inspector.ts` SHALL 在所有区块完成后执行全检（视觉/内容/响应式/动画/性能/代码/特色）。

#### Scenario: 全检通过
- **WHEN** 🔴=0 且 🟡≤3
- **THEN** 造物令进入 deployer 阶段

#### Scenario: 全检不通过回炉
- **WHEN** 存在 🔴 严重问题
- **THEN** 回退到 builder 修复，最多 3 轮

#### Scenario: 3 轮回炉失败
- **WHEN** 第 3 轮全检仍不通过
- **THEN** 造物令封存，封存辞"锻造失败"
