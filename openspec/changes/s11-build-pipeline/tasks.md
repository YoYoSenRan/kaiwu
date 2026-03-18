## 1. 产出目录管理

- [ ] 1.1 创建 `packages/domain/src/pipeline/product-dir.ts`：createProductDir + initProjectFromBlueprint — 验收：目录正确创建

## 2. 画师阶段

- [ ] 2.1 填充 `architect.ts`：调用画师 → 解析蓝图 → 拆任务 → 创建目录 — 验收：蓝图写入 phases.output，任务写入 tasks 表
- [ ] 2.2 精调画师 SOUL.md — 验收：蓝图精细度够匠人直接用

## 3. 锻造阶段

- [ ] 3.1 填充 `builder.ts`：分步调度 + 子角色区分 + 轻检触发 — 验收：分步锻造有过程记录
- [ ] 3.2 精调匠人 SOUL.md — 验收：代码规范、视觉还原、响应式质量

## 4. 试剑阶段

- [ ] 4.1 填充 `inspector.ts`：轻检 + 全检 + 回炉机制 — 验收：全检覆盖所有维度，回炉最多 3 轮
- [ ] 4.2 精调试剑 SOUL.md — 验收：审查全面，问题分级合理

## 5. 造物坊页面

- [ ] 5.1 创建造物坊页面组件（PipelineBoard + FunnelChart + DrumTimeline）— 验收：页面完整
- [ ] 5.2 更新造物志详情页（填充绘图/锻造/试剑章节）— 验收：章节内容正确

## 6. 验证

- [ ] 6.1 端到端测试：过堂通过 → 绘图 → 锻造 → 试剑 — 验收：器物页面可在浏览器查看
- [ ] 6.2 `pnpm typecheck` 通过
