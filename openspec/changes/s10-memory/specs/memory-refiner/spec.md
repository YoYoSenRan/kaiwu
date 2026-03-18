## ADDED Requirements

### Requirement: MEMORY.md 精炼

复盘时 SHALL 调用 `refineMemory()`：扫描 lessons.md + patterns.md → 筛选重要度 ≥4 → 压缩为一句话 → 写入 MEMORY.md。

#### Scenario: 精炼写入
- **WHEN** 复盘触发精炼
- **THEN** MEMORY.md 新增高重要度经验的压缩版

#### Scenario: 200 行上限
- **WHEN** MEMORY.md 超过 200 行
- **THEN** 删除最旧的低重要度条目，保持 200 行以内

### Requirement: OpenClaw 记忆搜索配置

SHALL 更新 openclaw.json 的 memorySearch.extraPaths，使 memory_search 可以索引 lessons.md、patterns.md、domain/、relationships.md。不同文件类型 SHALL 有不同的衰减规则（lessons/patterns 不衰减，domain 90 天半衰期）。

#### Scenario: 结构化记忆可搜索
- **WHEN** Agent 调用 memory_search 搜索"竞品分析"
- **THEN** 返回 lessons.md 和 domain/ 中包含"竞品分析"的经验条目
