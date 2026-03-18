## ADDED Requirements

### Requirement: 开物局模板完整

`packages/templates/src/presets/kaiwu-factory/` SHALL 包含：
- `manifest.json`：结构与 `design/Agent工作区设计/manifest.md` 一致
- 8 个 Agent 子目录，每个包含 SOUL.md、IDENTITY.md、TOOLS.md、HEARTBEAT.md

#### Scenario: manifest 结构正确
- **WHEN** 读取 `kaiwu-factory/manifest.json`
- **THEN** 包含 8 个 Agent 定义，每个有 id、name、title、stageType 字段

#### Scenario: workspace 文件完整
- **WHEN** 检查每个 Agent 子目录
- **THEN** 均包含 SOUL.md（非空）、IDENTITY.md（非空）、TOOLS.md（非空）、HEARTBEAT.md（可为空）

### Requirement: StageType 枚举更新

`packages/templates/src/types.ts` 的 StageType SHALL 为：scout / council / architect / builder / inspector / deployer。

#### Scenario: 类型定义正确
- **WHEN** 导入 StageType 类型
- **THEN** 只接受 6 个阶段值，旧值（triage/planning 等）编译报错

### Requirement: 模板初始化成功

执行 `initializeTemplate("kaiwu-factory")` SHALL 在 `~/.openclaw/` 下创建 8 个 workspace 目录。

#### Scenario: workspace 目录创建
- **WHEN** 执行模板初始化
- **THEN** `~/.openclaw/workspace-youshang/` 等 8 个目录存在，每个包含 SOUL.md、IDENTITY.md、TOOLS.md、HEARTBEAT.md、AGENTS.md

#### Scenario: Agent ID 与数据库一致
- **WHEN** 对比 `listAgents()` 返回的 ID 与数据库 agents 表
- **THEN** 8 个 ID 完全匹配（youshang、shuike、zhengchen、zhangcheng、huashi、jiangren、shijian、mingluo）

### Requirement: 结构化记忆目录

每个 Agent 的 workspace SHALL 包含记忆文件结构：MEMORY.md + memory/ 目录（含 lessons.md、patterns.md、relationships.md、domain/ 子目录）。

#### Scenario: 记忆目录存在
- **WHEN** 检查任意 Agent 的 workspace
- **THEN** 存在 MEMORY.md 和 memory/ 目录，memory/ 下有 lessons.md、patterns.md、relationships.md
