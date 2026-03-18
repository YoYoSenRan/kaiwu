## Context

编排层骨架已就位（s04），Agent workspace 的记忆文件结构已创建（s02）。本阶段实现记忆的写入和提炼逻辑。

记忆系统设计已在 `design/记忆系统设计.md` 中完整定义。

## Goals / Non-Goals

**Goals:**

- 造物令完成后各 Agent 的 memory/ 目录有新经验条目
- 每日总结 Cron 正常运行
- MEMORY.md 精炼后不超过 200 行
- Agent 调用 memory_search 可检索到历史经验

**Non-Goals:**

- 不实现记忆的可视化展示（属于打磨阶段）
- 不实现跨 Agent 记忆共享（MVP 各管各的）

## Decisions

### D1: LLM 提炼

经验提炼和每日总结都用 LLM 生成，不用规则引擎。LLM 可以理解上下文，生成更有价值的经验条目。

### D2: 文件级存储

记忆存在 OpenClaw workspace 的文件中（lessons.md / patterns.md / domain/ / relationships.md），不存数据库。与 OpenClaw 的 memory_search 原生集成。

## Risks / Trade-offs

- **LLM 提炼质量**：生成的经验可能太泛或太具体。→ prompt 中给出示例和格式要求。
- **文件并发写入**：多个提炼同时写同一个文件。→ MVP 单造物令排队，不存在并发。
