## ADDED Requirements

### Requirement: 经验提炼

造物令完成时 SHALL 调用 `extractExperience()`，为每个参与的 Agent 提炼经验条目。

提炼流程：收集各局中人的原始判断 → 对比最终结果 → LLM 生成经验条目 → 评估重要度（1-5）→ 写入记忆文件。

#### Scenario: 成功造物令提炼
- **WHEN** 造物令状态变为 launched
- **THEN** 游商的 memory/lessons.md 新增"采风判断准确"类经验，说客/诤臣的 memory/ 新增辩论相关经验

#### Scenario: 封存造物令提炼
- **WHEN** 造物令状态变为 dead
- **THEN** 相关 Agent 的 memory/ 新增"判断失误"或"正确预警"类经验
