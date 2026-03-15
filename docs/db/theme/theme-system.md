# 主题系统设计与换肤机制

## 核心思想

业务逻辑认 `stage_type`，UI 展示读 `theme`。

```
代码层：if (stage_type === "review") { ... }     ← 永远不变
展示层：label = pipeline.label  // "门下省" or "安全审计"  ← 随主题切换
```

## 数据结构

```
themes 表                            pipelines 表
┌──────────────────────┐            ┌──────────────────────────────┐
│ id: 1                │  1:N       │ theme_id: 1                  │
│ slug: sansheng-liubu │───────────▶│ stage_type: planning         │
│ name: 三省六部        │            │ label: 中书省                 │
│ is_active: true      │            │ emoji: 📜                    │
│ config: {colors...}  │            │ color: #a07aff               │
└──────────────────────┘            │ sort_order: 2                │
                                    │ config: {flavor_text: "..."}  │
┌──────────────────────┐            └──────────────────────────────┘
│ id: 2                │  1:N       ┌──────────────────────────────┐
│ slug: cyberpunk      │───────────▶│ theme_id: 2                  │
│ name: 赛博朋克        │            │ stage_type: planning         │
│ is_active: false     │            │ label: 架构师                 │
│ config: {colors...}  │            │ emoji: 🤖                    │
└──────────────────────┘            │ color: #00ff9f               │
                                    └──────────────────────────────┘
```

agents 表不存展示信息，只存 `stage_type`：

```
agents 表
┌───────────────────────┐
│ id: zhongshu          │
│ stage_type: planning  │──→ 运行时查 pipelines 获取当前主题的 label/emoji
│ model_id: 1           │
└───────────────────────┘
```

## 渲染时的查询逻辑

```
1. 获取当前激活主题
   SELECT * FROM themes WHERE is_active = true

2. 获取该主题的所有阶段
   SELECT * FROM pipelines WHERE theme_id = {active_theme.id} ORDER BY sort_order

3. 渲染某个 Agent 的名称
   const agent = await getAgent("zhongshu")
   const pipeline = pipelines.find(p => p.stage_type === agent.stage_type)
   display: `${pipeline.emoji} ${pipeline.label}`  // "📜 中书省"

4. 渲染 production_stages 的时间线
   for (const stage of stages) {
     const pipeline = pipelines.find(p => p.stage_type === stage.to_stage)
     display: `${pipeline.emoji} ${pipeline.label} — ${stage.reason}`
   }
```

## 切换主题

操作：Console 中选择新主题 → 确认

```sql
BEGIN;
UPDATE themes SET is_active = false WHERE is_active = true;
UPDATE themes SET is_active = true WHERE slug = 'cyberpunk';
COMMIT;
```

**影响范围：**

- ✅ UI 展示全部切换（label、emoji、色值、flavor text）
- ✅ 新创建的 production_stages 记录不受影响（存的是 stage_type，不是 label）
- ✅ 历史数据渲染自动使用新主题皮肤
- ✅ 业务逻辑完全不受影响
- ❌ 不影响 agents 表的 id 字段（`zhongshu` 还是 `zhongshu`）

## Agent ID 的处理

Agent ID（如 `zhongshu`）本身也带有三省六部含义。两种策略：

### 策略 A：Agent ID 保持语义化（推荐当前阶段）

```
agents.id = "zhongshu"    展示时查 theme 获取 label
agents.id = "bingbu"      展示时查 theme 获取 label
```

好处：代码可读性好，调试方便。
代价：Agent ID 带有旧主题的影子（但只是内部标识，用户看不到）。

### 策略 B：Agent ID 改为无语义（未来可选）

```
agents.id = "agent-planning-01"    纯功能标识
agents.id = "agent-execute-code"   纯功能标识
```

好处：完全主题无关。
代价：可读性差，当前阶段不值得。

**建议：现在用策略 A，未来如果需要彻底换肤再迁移到策略 B。**

## 内置主题：三省六部

### themes 数据

```json
{
  "slug": "sansheng-liubu",
  "name": "三省六部",
  "description": "以中国唐代三省六部制为骨架的多 Agent 协作叙事",
  "is_active": true,
  "config": {
    "colors": { "primary": "#D4AF37", "background": "#0A0A0A", "accent": "#FFBF00" },
    "flavor": {
      "production": "圣旨",
      "proposal": "奏折",
      "approve": "准奏",
      "reject": "封驳",
      "complete": "回奏",
      "publish": "颁行天下",
      "stage_enter": "{agent}接旨",
      "stage_exit": "{agent}呈交"
    }
  }
}
```

### pipelines 数据

| sort_order | stage_type | label  | emoji | color   | description                |
| ---------- | ---------- | ------ | ----- | ------- | -------------------------- |
| 1          | triage     | 太子   | 🤴    | #e8a040 | 消息分拣，判断是否值得立项 |
| 2          | planning   | 中书省 | 📜    | #a07aff | 接旨、规划、拆解子任务     |
| 3          | review     | 门下省 | 🔍    | #6a9eff | 审议方案，准奏或封驳       |
| 4          | dispatch   | 尚书省 | 📮    | #6aef9a | 派发任务，协调六部         |
| 5          | execute    | 六部   | ⚙️    | #ff9a6a | 并行实施                   |
| 6          | publish    | 回奏   | ✅    | #2ecc8a | 汇总结果，自动发布         |

### 六部 sub_role 在该主题下的展示

| sub_role | label | emoji |
| -------- | ----- | ----- |
| data     | 户部  | 💰    |
| doc      | 礼部  | 📝    |
| code     | 兵部  | ⚔️    |
| audit    | 刑部  | ⚖️    |
| infra    | 工部  | 🔧    |
| hr       | 吏部  | 👔    |

> 注：sub_role 的展示映射存在 pipelines 的 config JSONB 中，或在 themes 的 config 中统一定义。

## Site 的故事感

themes + pipelines + production_stages 三张表组合，为 site 提供完整的叙事素材：

```
site 首页展示：

  🤴 太子接旨 ─── 📜 中书省起草 ─── 🔍 门下省封驳！
                       ↑                    │
                       └────── 重新规划 ──────┘

  📜 中书省二次呈交 ─── 🔍 门下省准奏 ─── 📮 尚书省派发

  ⚔️ 兵部 ──┐
  📝 礼部 ──┼── 并行执行 ──→ ✅ 回奏皇上
  💰 户部 ──┘
```

每一步都有 `reason` 文本（来自 production_stages），配合 `flavor_text`（来自 pipelines.config），生成沉浸式的流程叙事。
