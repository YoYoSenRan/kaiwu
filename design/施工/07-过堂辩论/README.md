# 07 — 过堂辩论

## 目标

采风通过后，说客/诤臣多轮辩论，掌秤裁决。辩论过程可在展示网站实时旁听。

## 依赖

- 06-游商采风（采风报告作为过堂输入）
- 01-OpenClaw集成（说客/诤臣/掌秤 workspace 就绪）

## 文件清单

```
packages/domain/src/pipeline/phases/
└── council.ts                       # 过堂阶段处理器

packages/domain/src/pipeline/
└── situation.ts                     # 局势条计算（LLM 评估）

展示网站：
apps/site/src/app/
├── agents/
│   ├── page.tsx                     # 局中人总览
│   ├── [id]/page.tsx                # 局中人详情
│   ├── queries.ts
│   └── components/
│       ├── AgentGrid.tsx            # 角色卡片网格
│       ├── AgentDetail.tsx          # 角色详情
│       ├── RelationGraph.tsx        # 关系图谱
│       ├── RivalryCard.tsx          # 宿敌谱
│       └── AchievementBadge.tsx     # 轶事徽章
```

## 实现步骤

### Step 1：精调说客/诤臣/掌秤 SOUL.md

- 说客：重点测试论证说服力、数据引用、类比质量
- 诤臣：重点测试质疑犀利度、反驳针对性、不为反对而反对
- 掌秤：重点测试裁决公正性、条件合理性、封存辞质量
- 模拟 3-5 场完整过堂，验证辩论质量

### Step 2：填充过堂阶段处理器

文件：`packages/domain/src/pipeline/phases/council.ts`

```ts
async advance(project, phase): Promise<PhaseStepResult> {
  const currentRound = getCurrentRound(phase)

  if (currentRound <= maxRounds) {
    // 1. 调用说客（传入采风报告 + 历史辩论记录）
    // 2. 写入 debates 表
    // 3. 调用诤臣（传入采风报告 + 历史辩论记录 + 说客本轮发言）
    // 4. 写入 debates 表
    // 5. 计算局势条
    // 6. 返回 progressing
  } else {
    // 辩论结束，调用掌秤裁决
    // 写入 phases.output（裁决书）
    // 返回 completed
  }
}
```

### Step 3：局势条计算

文件：`packages/domain/src/pipeline/situation.ts`

- 每轮辩论结束后调用 LLM 评估双方论点
- 输出 shuikeScore / zhengchenScore / reason
- 写入 events.detail

### Step 4：局中人总览页

- 8 个角色卡片（头像、名号、状态、activity）
- 关系图谱（说客←宿敌→诤臣，游商→信赖→画师，匠人←相爱相杀→试剑）
- 功勋榜（从 events + agent_stats 聚合）

### Step 5：局中人详情页

- 属性面板（雷达图）
- 战绩统计
- 成长轨迹（里程碑时间线）
- 名场面集锦
- 宿敌谱（说客/诤臣专属）

### Step 6：过堂直播组件

- 实时显示当前辩论（说客气泡 + 诤臣气泡）
- 局势条实时更新
- 掌秤裁决特殊样式（印章 + 金边）

## 验收标准

- [ ] 采风通过的物帖自动进入过堂
- [ ] 说客和诤臣严格串行（说客先说，诤臣针对说客反驳）
- [ ] 辩论内容有实质（引用数据、有来有回），不是空洞的套话
- [ ] 掌秤裁决合理（通过/否决/有条件，附带理由）
- [ ] 局势条计算合理（不是永远 50:50）
- [ ] 局中人总览页正确展示 8 个角色
- [ ] 过堂直播 SSE 推送正常
- [ ] 宿敌谱数据正确（战绩、克制关系）

## 参考文档

- `design/流水线设计.md → Phase 2 过堂` — 辩论机制、轮次、裁决规则
- `design/流水线设计.md → 过堂的更鼓节奏` — 每次更鼓推进一整轮
- `design/Agent角色体系.md → 过堂戏剧结构` — 4 轮 + 裁决
- `design/Agent角色体系.md → 局势条计算` — 计算公式
- `design/功勋榜与轶事.md → 宿敌谱` — 战绩数据结构
- `design/角色介绍页.md` — 局中人详情页设计
