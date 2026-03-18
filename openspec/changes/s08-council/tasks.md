## 1. Agent Prompt 精调

- [ ] 1.1 精调说客 SOUL.md — 验收：论证有说服力，引用数据
- [ ] 1.2 精调诤臣 SOUL.md — 验收：质疑犀利，针对性强
- [ ] 1.3 精调掌秤 SOUL.md — 验收：裁决公正，条件合理
- [ ] 1.4 模拟 3-5 场完整过堂，验证辩论质量 — 验收：辩论有来有回，不是套话

## 2. 过堂阶段处理器

- [ ] 2.1 填充 `packages/domain/src/pipeline/phases/council.ts`：说客→诤臣串行调度 + 轮次管理 + 掌秤裁决 — 验收：tick() 正确推进辩论轮次
- [ ] 2.2 创建 `packages/domain/src/pipeline/situation.ts`：局势条 LLM 评估 — 验收：每轮输出合理的双方得分

## 3. 局中人页面

- [ ] 3.1 创建 `apps/site/src/app/agents/queries.ts`：查询 Agent 列表 + 详情 + stats — 验收：数据正确
- [ ] 3.2 创建 `apps/site/src/app/agents/components/AgentGrid.tsx`：8 个角色卡片网格 — 验收：卡片信息完整
- [ ] 3.3 创建 `apps/site/src/app/agents/components/RelationGraph.tsx`：关系图谱 — 验收：关系线正确
- [ ] 3.4 创建 `apps/site/src/app/agents/components/AgentDetail.tsx`：属性雷达图 + 战绩 + 名场面 — 验收：数据正确展示
- [ ] 3.5 创建 `apps/site/src/app/agents/components/RivalryCard.tsx`：宿敌谱 — 验收：战绩数据正确
- [ ] 3.6 更新 `apps/site/src/app/agents/page.tsx` + `[id]/page.tsx` — 验收：页面完整可用

## 4. 过堂直播

- [ ] 4.1 实现过堂直播组件（实时气泡 + 局势条 + 裁决样式）— 验收：SSE 推送辩论实时显示

## 5. 验证

- [ ] 5.1 端到端测试：采风通过 → 过堂 3-4 轮 → 裁决 — 验收：全链路跑通
- [ ] 5.2 `pnpm typecheck` 通过
