# 08 — 造物志

## 目标

造物令的完整故事可以在展示网站上浏览——列表页、详情页（章节式叙事）、对话流（按时间排序的群聊记录）、封存辞。

## 依赖

- 04-展示网站骨架（页面框架）
- 07-过堂辩论（至少有几个造物令的数据）

## 文件清单

```
apps/site/src/app/stories/
├── page.tsx                         # 造物志列表（卡片墙）
├── queries.ts                       # 查询（造物令列表、详情）
├── [id]/
│   ├── page.tsx                     # 造物志详情（章节式叙事）
│   ├── queries.ts
│   ├── flow/
│   │   └── page.tsx                 # 对话流（按时间排序）
│   └── components/
│       ├── StoryHeader.tsx          # 标题 + 概览
│       ├── ChapterScout.tsx         # 采风章节
│       ├── ChapterCouncil.tsx       # 过堂章节（辩论回放）
│       ├── ChapterArchitect.tsx     # 绘图章节（占位，Phase 4 填充）
│       ├── ChapterBuilder.tsx       # 锻造章节（占位）
│       ├── ChapterInspector.tsx     # 试剑章节（占位）
│       ├── ChapterDeployer.tsx      # 鸣锣章节（占位）
│       ├── Epitaph.tsx              # 封存辞
│       └── AgentQuotes.tsx          # 局中人感想
├── components/
│   ├── StoryCard.tsx                # 造物志卡片
│   └── StoryFilter.tsx              # 筛选（全部/正在造/已开物/封存）

apps/site/src/app/stories/[id]/flow/
├── page.tsx                         # 对话流页面
├── queries.ts                       # 聚合 agent_logs + debates + events
└── components/
    ├── FlowMessage.tsx              # 单条消息（角色气泡）
    ├── FlowSystem.tsx               # 系统消息（阶段转换、更鼓）
    ├── FlowSituation.tsx            # 局势条
    └── FlowFilter.tsx               # 筛选（全部/只看过堂/只看某角色）
```

## 实现步骤

### Step 1：造物志列表页

- 查询 projects 表 + 关联的 keywords
- 卡片墙布局（已开物/正在造/封存 不同视觉风格）
- 筛选标签
- 进度条（采风→过堂→绘图→锻造→试剑→鸣锣）

### Step 2：造物志详情页

- 章节式滚动叙事
- 采风章节：项目背景 + 评分雷达图 + 游商评语
- 过堂章节：辩论回放（气泡 + 局势条 + 裁决）
- 后续章节先占位（Phase 4/5 填充）
- 封存辞（如果是封存的造物令）
- 局中人感想（agent_logs 中 visibility: public 的 thought）

### Step 3：对话流页面

- 从 agent_logs + debates + events 聚合，按 created_at 排序
- 每条消息带时间戳
- 阶段转换作为分隔线
- 角色气泡用角色专属色
- 筛选功能
- SSE 实时追加（如果造物令正在进行中）

### Step 4：封存辞页面

- 特殊视觉（低饱和度、居中排版）
- 享年（造物流中存活的时间）
- 致命一击（哪个局中人的哪句话）
- "这个创意有救吗？"（链接到物帖提交）

## 验收标准

- [ ] 造物志列表正确展示所有造物令
- [ ] 卡片视觉区分（已开物明亮、正在造脉冲、封存低饱和）
- [ ] 详情页章节式叙事流畅
- [ ] 过堂章节的辩论回放完整（气泡 + 局势条）
- [ ] 对话流按真实时间排序，能感受到节奏
- [ ] 封存辞页面有仪式感
- [ ] 筛选功能正常

## 参考文档

- `design/展示网站设计.md → 造物志` — 列表页、详情页设计
- `design/展示网站设计.md → 造物令对话流` — 对话流设计、消息类型、数据来源
- `design/展示网站设计.md → 被封存物帖的终章` — 封存辞设计
- `design/界面设计/造物志.md` — 线框图和样式规格
