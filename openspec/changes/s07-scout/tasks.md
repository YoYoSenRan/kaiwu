## 1. 游商 Prompt 精调

- [ ] 1.1 精调 `packages/templates/src/presets/kaiwu-factory/agents/youshang/SOUL.md` — 验收：手动触发 5 次，采风报告质量稳定
- [ ] 1.2 手动测试采风报告输出格式（项目背景 + 四维度评分 + 建议）— 验收：Zod schema 校验通过

## 2. 采风阶段处理器

- [ ] 2.1 填充 `packages/domain/src/pipeline/phases/scout.ts`：组装消息 → callAgent → 解析报告 → 写入 output → 自动决策 — 验收：tick() 调用后采风报告写入 phases.output
- [ ] 2.2 实现封存辞生成（评分 < 60 时额外调用游商）— 验收：封存的物帖有封存辞

## 3. 端到端测试

- [ ] 3.1 插入种子物帖 → 手动 tick() → 验证造物令创建 + 游商调用 + 报告写入 + 决策执行 + 事件记录 — 验收：全链路跑通

## 4. 首页 — 开物局全景

- [ ] 4.1 创建 `apps/site/src/app/(home)/components/Panorama.tsx`：SVG 横向长卷（前堂 + 内坊 + 后院）— 验收：全景图在首页显示
- [ ] 4.2 创建 `apps/site/src/app/(home)/components/AgentBubble.tsx`：Agent 状态气泡（emoji + status + activity）— 验收：8 个局中人状态正确显示

## 5. 首页 — 群聊记录

- [ ] 5.1 创建 `apps/site/src/app/(home)/components/ChatFeed.tsx`：聚合 agent_logs + debates + events，按时间排序 + SSE 实时追加 — 验收：采风过程中消息实时出现
- [ ] 5.2 更新 `apps/site/src/app/(home)/page.tsx`：组装全景图 + 群聊记录 — 验收：首页内容完整

## 6. 验证

- [ ] 6.1 采风报告质量检查（项目背景完整、评分合理）
- [ ] 6.2 SSE 推送正常（采风过程中网站实时更新）
- [ ] 6.3 `pnpm typecheck` 通过
