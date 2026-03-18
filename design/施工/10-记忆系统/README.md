# 09 — 记忆系统

## 目标

编排层在造物令完成时自动提炼经验，每日总结 Cron 运转，Agent 的记忆随实战积累。

## 依赖

- 03-编排层（造物令完成的钩子）
- 01-OpenClaw集成（workspace 记忆文件结构）

## 文件清单

```
packages/domain/src/
├── memory/
│   ├── extractor.ts                 # 经验提炼器（造物令完成时）
│   ├── daily.ts                     # 每日总结逻辑（Cron #3）
│   ├── refiner.ts                   # MEMORY.md 精炼（复盘时）
│   └── writer.ts                    # 记忆文件写入（lessons.md / patterns.md / domain/ / relationships.md）
```

## 实现步骤

### Step 1：记忆文件写入器

文件：`writer.ts`

- 读取现有记忆文件内容
- 追加新条目（带编号、来源造物令、重要度）
- 写回文件
- 支持 lessons.md / patterns.md / domain/{赛道}.md / relationships.md

### Step 2：经验提炼器

文件：`extractor.ts`

造物令完成时调用：

```ts
async function extractExperience(project: Project): Promise<void> {
  // 1. 收集各局中人的原始判断（从 phases.output）
  // 2. 对比最终结果（launched / dead）
  // 3. 调用 LLM 生成经验条目（教训/模式/领域知识/关系记忆）
  // 4. 为每条经验评估重要度（1-5）
  // 5. 调用 writer 写入对应 Agent 的记忆文件
}
```

### Step 3：每日总结

文件：`daily.ts`

Cron #3 触发时调用：

```ts
async function dailySummary(): Promise<void> {
  // 1. 查询今天的 agent_logs + events + debates
  // 2. 按局中人分组
  // 3. 调用 LLM 生成每日摘要
  // 4. 写入各 Agent 的 memory/YYYY-MM-DD.md
  // 5. 如果提炼出重要经验（同类问题 ≥2 次等），直接写入 lessons/patterns
}
```

### Step 4：MEMORY.md 精炼

文件：`refiner.ts`

复盘时调用：

```ts
async function refineMemory(agentId: string): Promise<void> {
  // 1. 扫描 lessons.md 和 patterns.md
  // 2. 筛选重要度 ≥ 4 的条目
  // 3. 压缩为一句话
  // 4. 写入 MEMORY.md 的对应段落
  // 5. 如果超过 200 行，删除最旧的低重要度条目
}
```

### Step 5：接入编排层

在编排层的造物令完成钩子中调用 `extractExperience()`。
在复盘逻辑中调用 `refineMemory()`。

## 验收标准

- [ ] 造物令完成后，各 Agent 的 memory/ 目录下有新的经验条目
- [ ] 经验条目格式正确（编号、来源、重要度）
- [ ] 每日总结 Cron 正常运行，生成 memory/YYYY-MM-DD.md
- [ ] 重要经验（≥4）直接写入 lessons.md / patterns.md
- [ ] MEMORY.md 精炼后不超过 200 行
- [ ] Agent 调用 memory_search 可以检索到历史经验

## 参考文档

- `design/记忆系统设计.md` — 三层架构、提炼流程、每日总结、精炼机制
- `design/记忆系统设计.md → 各角色的提炼维度` — 8 个角色各自对比什么
