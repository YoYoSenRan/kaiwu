## 1. 造物志列表

- [ ] 1.1 创建 `apps/site/src/app/stories/queries.ts`：查询造物令列表（含 keyword + 状态 + 进度）— 验收：数据正确
- [ ] 1.2 创建 `apps/site/src/app/stories/components/StoryCard.tsx`：卡片（文本 + 状态 + 进度条 + 提交者）— 验收：视觉区分正确
- [ ] 1.3 创建 `apps/site/src/app/stories/components/StoryFilter.tsx`：筛选 tabs — 验收：筛选切换正常
- [ ] 1.4 更新 `apps/site/src/app/stories/page.tsx`：组装卡片墙 + 筛选 — 验收：列表页完整

## 2. 造物志详情

- [ ] 2.1 创建 `apps/site/src/app/stories/[id]/queries.ts`：查询造物令详情 + 各阶段 output — 验收：数据完整
- [ ] 2.2 创建 ChapterScout.tsx：采风章节（背景 + 雷达图 + 评语）— 验收：数据正确展示
- [ ] 2.3 创建 ChapterCouncil.tsx：过堂章节（辩论回放 + 局势条 + 裁决）— 验收：辩论完整回放
- [ ] 2.4 创建 ChapterArchitect/Builder/Inspector/Deployer.tsx：占位章节 — 验收：显示"此章节待续"
- [ ] 2.5 创建 Epitaph.tsx：封存辞组件 — 验收：封存造物令显示封存辞
- [ ] 2.6 创建 AgentQuotes.tsx：局中人感想组件（从 agent_logs visibility:public type:thought 提取）— 验收：各章节末尾显示感想
- [ ] 2.7 更新 `apps/site/src/app/stories/[id]/page.tsx`：组装章节 — 验收：详情页完整

## 3. 对话流

- [ ] 3.1 创建对话流 queries.ts：聚合 agent_logs + debates + events — 验收：按时间排序正确
- [ ] 3.2 创建 FlowMessage.tsx + FlowSystem.tsx + FlowSituation.tsx + FlowFilter.tsx — 验收：消息类型区分正确
- [ ] 3.3 更新 flow/page.tsx：组装对话流 + SSE 实时追加 — 验收：实时消息正常

## 4. 验证

- [ ] 4.1 造物志列表 + 详情 + 对话流端到端测试
- [ ] 4.2 `pnpm typecheck` 通过
