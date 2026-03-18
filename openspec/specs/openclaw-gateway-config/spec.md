## ADDED Requirements

### Requirement: Gateway 内置心跳保留默认

Gateway 内置心跳 SHALL 保留默认配置（30m 间隔），不禁用。所有 Agent 的 HEARTBEAT.md 仅含注释，心跳触发不产生业务操作。造物流调度由 Cron（更鼓）独立控制。

#### Scenario: 心跳不干扰业务
- **WHEN** Gateway 心跳触发
- **THEN** Agent 回复 HEARTBEAT_OK，不触发造物流操作

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
