## 1. 游商 Prompt 精调

- [ ] 1.1 精调 `packages/templates/src/presets/kaiwu-factory/agents/youshang/SOUL.md` — 验收：手动触发 5 次，采风报告质量稳定
- [ ] 1.2 手动测试采风报告输出格式（项目背景 + 四维度评分 + 建议）— 验收：Zod schema 校验通过

## 2. 采风阶段处理器（异步状态机）

- [ ] 2.1 填充 `packages/domain/src/pipeline/phases/scout.ts` advance()：检查 phase.output 是否有值 → 无值时通过 callAgent 分发采风任务（返回 in_progress）→ 有值时 Zod 校验报告格式（返回 completed 或 failed）— 验收：两轮 tick 完成一次采风
- [ ] 2.2 采风消息组装：从 keywords 表读取物帖文本 + 理由 + 预采风数据，拼接为游商 prompt — 验收：消息包含物帖完整信息
- [ ] 2.3 封存辞处理：评分 < 60 时用编排层模板（s04 D11），如有 privateNote 则拼接 — 验收：封存的物帖有封存辞

## 3. 端到端测试

- [ ] 3.1 插入种子物帖 → 手动 tick() 两次（分发 + 收结果）→ 验证造物令创建 + 游商调用 + 报告写入 + 决策执行 + 事件记录 — 验收：全链路跑通（需 Gateway + LLM provider 运行）

## 4. 首页 — 开物局全景（依赖 s05）

- [ ] 4.1 创建 `apps/site/src/app/(home)/components/Panorama.tsx`：SVG 横向长卷（前堂 + 内坊 + 后院）— 验收：全景图在首页显示
- [ ] 4.2 创建 `apps/site/src/app/(home)/components/AgentBubble.tsx`：Agent 状态气泡（emoji + status + activity）— 验收：8 个局中人状态正确显示

## 5. 首页 — 群聊记录（依赖 s05）

- [ ] 5.1 创建 `apps/site/src/app/(home)/components/ChatFeed.tsx`：聚合 agent_logs + debates + events，按时间排序 + SSE 实时追加 — 验收：采风过程中消息实时出现
- [ ] 5.2 更新 `apps/site/src/app/(home)/page.tsx`：组装全景图 + 群聊记录 — 验收：首页内容完整

## 6. 验证

- [ ] 6.1 采风报告质量检查（项目背景完整、评分合理）
- [ ] 6.2 SSE 推送正常（采风过程中网站实时更新）
- [ ] 6.3 `pnpm typecheck` 通过
