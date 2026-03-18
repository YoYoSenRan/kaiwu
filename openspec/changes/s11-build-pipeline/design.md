## Context

过堂阶段已跑通（s08）。本阶段实现造物流的产出阶段，让 Agent 真正"造东西"。

## Goals / Non-Goals

**Goals:**

- 画师蓝图精细度够用（匠人不需要猜设计意图）
- 匠人分步锻造，每步有过程记录
- 试剑轻检/全检覆盖所有维度
- 回炉机制正常（全检不通过 → 回到锻造修复，最多 3 轮）
- 最终产出的页面视觉精美

**Non-Goals:**

- 不追求完美的代码生成质量（持续精调 prompt）
- 不实现匠人子角色的真正并行（MVP 串行调用，逻辑上区分子角色）

## Decisions

### D1: 匠人子角色串行调用

设计文档说匠人·形/色/动可以并行，但 MVP 阶段简化为串行调用（同一个 Agent 三次独立 session）。逻辑上区分子角色，实际串行执行。

### D2: 产出目录在 ~/.openclaw/products/

每个造物令一个独立目录，用 project.slug 命名。.kaiwu/ 子目录存元数据，src/ 存器物代码。

### D3: OpenClaw 统一目录结构

所有 OpenClaw 相关文件统一放在 `OPENCLAW_DIR`（默认 `~/.openclaw`）下：

```
~/.openclaw/
├── workspaces/{agent-id}/          # Agent workspace（s02 创建）
│   ├── SOUL.md / TOOLS.md          # Agent 人格和工具定义
│   └── memory/                     # Agent 记忆文件（s10）
│       ├── MEMORY.md
│       ├── lessons.md
│       ├── patterns.md
│       └── domain/
├── products/{project-slug}/        # 造物产出（s11）
│   ├── .kaiwu/                     # 元数据（蓝图快照、锻造日志）
│   └── src/                        # 器物代码
├── gateway.yaml                    # Gateway 配置（agents + plugins + tools）
└── plugins/
    └── kaiwu-tools/                # 自建 Plugin（s03 第 8 组）
        ├── openclaw.plugin.json
        └── index.ts
```

`scripts/sync-workspaces.ts`（s03 第 9 组）负责从 templates preset 同步到 workspaces/ 并生成 gateway.yaml。

## Risks / Trade-offs

- **代码生成质量**：匠人产出的代码质量是最大风险。→ 试剑轻检每步介入，全检兜底。
- **蓝图精细度**：画师蓝图不够细，匠人就要猜。→ 精调画师 prompt，要求具体到色值和间距。
