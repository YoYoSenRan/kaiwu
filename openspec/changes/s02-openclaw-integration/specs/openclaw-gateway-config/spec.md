## ADDED Requirements

### Requirement: Gateway 内置心跳关闭

openclaw.json 中 SHALL 设置 `agents.defaults.heartbeat.every: null`，禁用 Gateway 自带心跳。

#### Scenario: 心跳已关闭
- **WHEN** 读取 openclaw.json 配置
- **THEN** `agents.defaults.heartbeat.every` 为 null

### Requirement: memory_search 混合搜索配置

openclaw.json 中 SHALL 配置 memory_search 为混合搜索模式：
- hybrid.enabled: true
- vectorWeight: 0.7, textWeight: 0.3
- temporalDecay: enabled, halfLifeDays: 30
- mmr: enabled, lambda: 0.7

#### Scenario: 搜索配置正确
- **WHEN** 读取 openclaw.json 的 memorySearch 配置
- **THEN** hybrid 搜索已启用，权重和衰减参数与设计文档一致

### Requirement: 产出目录存在

`~/.openclaw/products/` 目录 SHALL 存在，用于存放造物令的产出代码。

#### Scenario: 目录已创建
- **WHEN** 检查文件系统
- **THEN** `~/.openclaw/products/` 目录存在
