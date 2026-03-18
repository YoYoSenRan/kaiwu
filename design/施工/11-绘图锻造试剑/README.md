# 10 — 绘图 + 锻造 + 试剑

## 目标

画师出蓝图 → 匠人分步写代码 → 试剑轻检/全检。器物（前端展示页面）可以被造出来。

## 依赖

- 07-过堂辩论（过堂通过后触发绘图）
- 01-OpenClaw集成（画师/匠人/试剑 workspace 就绪）

## 文件清单

```
packages/domain/src/pipeline/phases/
├── architect.ts                     # 绘图阶段处理器
├── builder.ts                       # 锻造阶段处理器（分步 + 子角色）
└── inspector.ts                     # 试剑阶段处理器（轻检 + 全检）

packages/domain/src/pipeline/
└── product-dir.ts                   # 产出目录管理（创建/初始化项目目录）

展示网站：
apps/site/src/app/pipeline/
├── page.tsx                         # 造物坊页面
├── queries.ts
└── components/
    ├── PipelineBoard.tsx            # 看板（6 阶段泳道）
    ├── FunnelChart.tsx              # 漏斗数据
    └── DrumTimeline.tsx             # 更鼓时间线
```

## 实现步骤

### Step 1：产出目录管理

文件：`product-dir.ts`

```ts
async function createProductDir(slug: string): Promise<string> {
  // 创建 ~/.openclaw/products/{slug}/
  // 创建 .kaiwu/ 子目录
  // 返回项目路径
}

async function initProjectFromBlueprint(slug: string, blueprint: Blueprint): Promise<void> {
  // 将蓝图快照写入 .kaiwu/blueprint.json
  // 将任务清单写入 .kaiwu/tasks.json
  // 根据蓝图的技术栈初始化项目骨架（package.json、tsconfig 等）
}
```

### Step 2：画师阶段处理器

文件：`architect.ts`

```ts
async advance(project, phase): Promise<PhaseStepResult> {
  // 1. 组装消息（采风报告 + 裁决书 + 附带条件）
  // 2. 调用画师
  // 3. 解析蓝图（Zod 校验）
  // 4. 写入 phases.output
  // 5. 从蓝图提取任务列表，写入 tasks 表
  // 6. 创建产出目录，初始化项目
  // 7. 返回 completed
}
```

### Step 3：精调画师 SOUL.md

重点测试：
- 蓝图精细度（匠人能不能直接用，不需要猜）
- 视觉方向是否具体（有参考色值，不是"好看就行"）
- 任务拆解是否合理（区块划分、依赖关系）

### Step 4：锻造阶段处理器

文件：`builder.ts`

```ts
async advance(project, phase): Promise<PhaseStepResult> {
  const currentStep = getCurrentStep(phase)

  if (currentStep === 0) {
    // Step 1：搭骨架（匠人·形）
    // 调用匠人，传入 projectPath + 蓝图
    // 试剑轻检
  } else if (currentStep <= totalSections) {
    // Step N：做第 N 个区块
    // 匠人·形搭结构 → 匠人·色上样式 → 匠人·动加动画
    // 试剑轻检
  } else {
    // 最后一步：整体打磨
    // 匠人·色全局一致性 + 匠人·动全页体验
    // 返回 completed
  }
}
```

### Step 5：精调匠人 SOUL.md

重点测试：
- 代码规范（目录结构、组件拆分、注释）
- 视觉还原度（配色、间距是否与蓝图一致）
- 响应式质量（三个断点）
- 动画流畅度

### Step 6：试剑阶段处理器

文件：`inspector.ts`

```ts
// 轻检（锻造过程中调用，不走正式流程）
async lightReview(projectPath: string, section: string): Promise<LightReviewResult> {
  // 调用试剑，只看当前区块
  // 返回问题列表（当场修复）
}

// 全检（所有区块完成后）
async advance(project, phase): Promise<PhaseStepResult> {
  // 调用试剑，完整审查清单
  // 解析试剑报告
  // 自动决策（🔴=0 且 🟡≤3 → 通过）
}
```

### Step 7：精调试剑 SOUL.md

重点测试：
- 审查是否全面（视觉/内容/响应式/动画/性能/代码/特色）
- 问题分级是否合理（🔴/🟡/🟢）
- 修复建议是否可执行

### Step 8：造物坊页面

- 看板（6 阶段泳道，当前造物令在哪个阶段）
- 漏斗数据（物帖 → 采风通过 → 过堂通过 → 开物）
- 更鼓时间线（最近的更鼓事件）

## 验收标准

- [ ] 过堂通过后自动进入绘图
- [ ] 画师蓝图精细度够用（匠人不需要猜设计意图）
- [ ] 产出目录正确创建（~/.openclaw/products/{slug}/）
- [ ] 匠人分步锻造（骨架 → 区块 → 打磨），每步有过程记录
- [ ] 试剑轻检在每个区块完成后触发
- [ ] 试剑全检覆盖所有审查维度
- [ ] 回炉机制正常（全检不通过 → 回到锻造修复）
- [ ] 最终产出的页面视觉精美、响应式正常、动画流畅
- [ ] 造物坊页面正确展示当前状态

## 参考文档

- `design/流水线设计.md → Phase 3 绘图` — 蓝图内容、精细度要求
- `design/流水线设计.md → Phase 4 锻造` — 技术栈、代码规范、分步流程、子角色
- `design/流水线设计.md → Phase 5 试剑` — 轻检/全检、审查清单
- `design/流水线设计.md → 产出目录规范` — 目录结构
- `design/界面设计/造物坊.md` — 造物坊页面线框图
