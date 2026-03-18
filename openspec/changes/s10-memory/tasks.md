## 1. 记忆文件写入器

- [ ] 1.1 创建 `packages/domain/src/memory/writer.ts`：读取现有文件 → 追加条目（编号/来源/重要度）→ 写回 — 验收：文件正确追加

## 2. 经验提炼器

- [ ] 2.1 创建 `packages/domain/src/memory/extractor.ts`：收集判断 → 对比结果 → LLM 生成 → 评估重要度 → 调用 writer — 验收：造物令完成后 memory/ 有新条目
- [ ] 2.2 在编排层造物令完成钩子中接入 extractExperience() — 验收：自动触发
- [ ] 2.3 在编排层复盘逻辑中接入 refineMemory()（7/30/90 天复盘时触发）— 验收：复盘后 MEMORY.md 更新

## 3. 每日总结

- [ ] 3.1 创建 `packages/domain/src/memory/daily.ts`：查询今日数据 → 分组 → LLM 摘要 → 写入 YYYY-MM-DD.md — 验收：Cron #3 触发后有摘要文件
- [ ] 3.2 实现重复模式识别（同类问题 ≥2 次直接写入 lessons/patterns）— 验收：重复模式被识别并记录

## 4. MEMORY.md 精炼

- [ ] 4.1 创建 `packages/domain/src/memory/refiner.ts`：筛选重要度 ≥4 → 压缩 → 写入 MEMORY.md → 200 行上限 — 验收：精炼后 MEMORY.md 不超过 200 行
- [ ] 4.2 更新 OpenClaw memorySearch.extraPaths 配置（指向 lessons.md / patterns.md / domain/ / relationships.md + 衰减规则）— 验收：memory_search 可索引结构化记忆文件
- [ ] 4.3 更新各 Agent 的 SOUL.md，引导 Agent 在工作前先调用 memory_search 检索历史经验 — 验收：SOUL.md 中有 memory_search 使用指引

## 5. 验证

- [ ] 5.1 造物令完成后经验提炼端到端测试
- [ ] 5.2 memory_search 可检索到新写入的经验
- [ ] 5.3 `pnpm typecheck` 通过
