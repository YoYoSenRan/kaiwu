# 06 — 游商采风

## 目标

物帖进入造物流后，游商自动采风，产出包含项目背景的采风报告。完成后第一个 Agent 端到端跑通。

## 依赖

- 01-OpenClaw集成（游商 workspace 就绪）
- 03-编排层（tick + 阶段流转）

## 文件清单

```
packages/domain/src/pipeline/phases/
└── scout.ts                         # 采风阶段处理器（填充骨架）

packages/templates/src/presets/kaiwu-factory/agents/youshang/
└── SOUL.md                          # 精调后的最终版

展示网站：
apps/site/src/app/
├── (home)/
│   ├── page.tsx                     # 首页（开物局全景 + 群聊记录）
│   └── components/
│       ├── Panorama.tsx             # 开物局全景（先做静态版）
│       ├── ChatFeed.tsx             # 群聊记录列表
│       └── AgentBubble.tsx          # Agent 状态气泡
```

## 实现步骤

### Step 1：精调游商 SOUL.md

- 基于 `Agent工作区设计/游商/SOUL.md` 精调 prompt
- 重点测试：项目背景生成质量、四维度评分合理性、展示潜力判断
- 手动触发 5-10 次，验证输出格式和内容质量

### Step 2：填充采风阶段处理器

文件：`packages/domain/src/pipeline/phases/scout.ts`

```ts
async advance(project, phase): Promise<PhaseStepResult> {
  // 1. 组装消息（物帖文本 + 理由 + 预采风数据）
  // 2. 调用游商（callAgent）
  // 3. 解析采风报告（Zod 校验）
  // 4. 写入 phases.output
  // 5. 自动决策（≥60 通过 / <60 封存）
  // 6. 如果封存，额外调用游商生成封存辞
}
```

### Step 3：端到端测试

1. 手动插入一条种子物帖到 keywords 表
2. 手动调用 `tick()`
3. 验证：造物令创建 → 游商被调用 → 采风报告写入 → 决策执行 → 事件记录

### Step 4：首页 — 开物局全景（静态版）

- SVG 横向长卷（物帖墙 → 过堂 → 画室 → 锻造坊 → 试剑台 → 鸣锣台）
- 8 个局中人在各自位置，显示 status + activity
- 先做静态版（无微动画），后续 Phase 6 增强

### Step 5：首页 — 群聊记录

- 从 agent_logs（visibility: public）+ debates + events 聚合
- 按 created_at 排序
- SSE 实时追加新消息
- 筛选：全部 / 只看某个造物令

## 验收标准

- [ ] 种子物帖可以自动进入采风
- [ ] 游商产出的采风报告包含完整的项目背景（positioning、targetUser、corePainPoint 等）
- [ ] 四维度评分合理（不是全 50 或全 100）
- [ ] 评分 ≥ 60 的物帖自动进入过堂阶段
- [ ] 评分 < 60 的物帖自动封存，有封存辞
- [ ] 首页全景图显示 8 个局中人的状态
- [ ] 首页群聊记录显示游商的采风过程
- [ ] SSE 推送正常（采风过程中网站实时更新）

## 参考文档

- `design/流水线设计.md → Phase 1 采风` — 采风流程、项目背景生成、评分维度
- `design/Agent工作区设计/游商/SOUL.md` — 游商人格和行为准则
- `design/Agent工作区设计/游商/TOOLS.md` — 采风报告输出格式
- `design/展示网站设计.md → 首页` — 开物局全景 + 群聊记录
