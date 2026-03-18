# 11 — 鸣锣部署

## 目标

器物自动部署到 Vercel，冒烟测试通过后鸣锣问世。复盘机制上线。造物流完整闭环。

## 依赖

- 10-绘图锻造试剑（试剑通过后触发鸣锣）

## 文件清单

```
packages/domain/src/pipeline/phases/
└── deployer.ts                      # 鸣锣阶段处理器

packages/domain/src/pipeline/
└── retrospective.ts                 # 复盘逻辑

packages/domain/src/agents/
└── stats.ts                         # 属性计算（填充骨架）
```

## 实现步骤

### Step 1：鸣锣阶段处理器

文件：`deployer.ts`

```ts
async advance(project, phase): Promise<PhaseStepResult> {
  // 1. 调用鸣锣 Agent
  //    传入 projectPath（~/.openclaw/products/{slug}/）
  // 2. 鸣锣执行部署清单：
  //    - 构建产物打包
  //    - Git push 到仓库
  //    - 触发 Vercel 部署
  //    - 等待部署完成
  //    - 冒烟测试（HTTP 请求关键页面）
  // 3. 解析鸣锣报告
  // 4. 冒烟通过 → 创建 products 记录，projects.status = launched
  // 5. 冒烟失败 → 回退到试剑
}
```

### Step 2：精调鸣锣 SOUL.md

重点测试：
- 部署流程是否完整（不漏步骤）
- 冒烟测试是否有效（能发现真正的问题）
- 回滚方案是否可执行

### Step 3：复盘逻辑

文件：`retrospective.ts`

```ts
async function checkAndTriggerRetrospective(project: Project): Promise<void> {
  // 检查 7/30/90 天是否到期
  // 收集数据（HTTP HEAD + 游商回访数据）
  // 对比判断 vs 实际
  // 计算属性变更
  // 生成复盘志
  // 写入 retrospectives 表
  // 更新 agent_stats
  // 精炼 MEMORY.md
}
```

### Step 4：属性计算

文件：`stats.ts`

```ts
async function updateAgentStats(project: Project): Promise<void> {
  // 根据造物令结果更新各局中人的属性
  // 游商：采风评分 vs 最终结果 → 更新嗅觉
  // 说客：支持的造物令是否成功 → 更新信誉
  // 诤臣：质疑的风险是否出现 → 更新先见
  // ... 其余角色类推
}
```

### Step 5：功勋榜和轶事检查

在造物令完成钩子中顺带执行：

```ts
async function checkAchievements(project: Project): Promise<void> {
  // 检查各轶事的解锁条件
  // 解锁的写入 events（achievement_unlocked）+ MEMORY.md
  // 更新宿敌谱数据（写入说客/诤臣的 relationships.md）
}
```

### Step 6：展示网站 — 器物坊 + 完整造物志

- 器物坊组件（已开物的器物展示，可点击访问）
- 造物志补充"绘图"、"锻造"、"试剑"、"鸣锣"章节
- 复盘志展示

## 验收标准

- [ ] 试剑通过后自动进入鸣锣
- [ ] 器物成功部署到 Vercel，可通过 URL 访问
- [ ] 冒烟测试能检测到页面异常（返回非 200）
- [ ] 冒烟失败时正确回退到试剑
- [ ] products 记录正确创建
- [ ] 造物令状态正确更新为 launched
- [ ] 属性计算正确（agent_stats 更新）
- [ ] 轶事解锁检查正常
- [ ] 复盘在 7 天后正确触发
- [ ] 第一个物帖完整走完 6 阶段 🎉

## 参考文档

- `design/流水线设计.md → Phase 6 鸣锣` — 部署流程、冒烟测试、回滚
- `design/流水线设计.md → 复盘触发机制` — 7/30/90 天、数据来源、对比维度
- `design/角色属性系统.md → 经验循环` — 属性计算方式
- `design/功勋榜与轶事.md` — 轶事解锁条件、宿敌谱更新
