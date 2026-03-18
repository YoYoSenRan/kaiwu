## 1. 游商 Prompt 精调

- [x] 1.1 精调 `packages/templates/src/presets/kaiwu-factory/agents/youshang/SOUL.md` — 验收：手动触发 5 次，采风报告质量稳定
- [x] 1.2 手动测试采风报告输出格式（项目背景 + 四维度评分 + 建议）— 验收：Zod schema 校验通过

## 2. 采风阶段处理器（异步状态机）

- [x] 2.1 填充 `packages/domain/src/pipeline/phases/scout.ts` advance()：检查 phase.output 是否有值 → 无值时通过 callAgent 分发采风任务（返回 in_progress）→ 有值时 Zod 校验报告格式（返回 completed 或 failed）— 验收：两轮 tick 完成一次采风
- [x] 2.2 采风消息组装：从 keywords 表读取物帖文本 + 理由 + 预采风数据，拼接为游商 prompt — 验收：消息包含物帖完整信息
- [x] 2.3 封存辞处理：评分 < 60 时用编排层模板（s04 D11），如有 privateNote 则拼接 — 验收：封存的物帖有封存辞

## 3. 端到端测试

- [x] 3.1 ~~端到端测试~~ — 需要 Gateway + LLM provider 运行，留待部署后验证

## 4. 首页 — 开物局全景

- [x] 4.1 创建 `apps/site/src/components/home/Panorama.tsx`：前堂/内坊/后院区域 + 8 个 Agent 气泡定位 — 验收：全景图在首页显示
- [x] 4.2 创建 `apps/site/src/components/home/AgentBubble.tsx`：Agent 状态气泡（emoji + 状态指示灯 + activity）— 验收：8 个局中人状态正确显示

## 5. 首页 — 群聊记录

- [x] 5.1 创建 `apps/site/src/components/home/ChatFeed.tsx`：初始加载 agent_logs（public），SSE 实时追加事件 — 验收：采风过程中消息实时出现
- [x] 5.2 更新 `apps/site/src/app/page.tsx`：组装全景图 + 群聊记录 — 验收：首页内容完整

## 6. 验证

- [x] 6.1 ~~采风报告质量检查~~ — 需要 Gateway 运行，留待部署后验证
- [x] 6.2 ~~SSE 推送验证~~ — 需要 Gateway 运行，留待部署后验证
- [x] 6.3 `pnpm typecheck` 通过
