# 01 — OpenClaw 集成

## 目标

OpenClaw Gateway 运行就绪，8 个 Agent 的 workspace 部署完成，3 个 Cron Job 注册，memory_search 配置完成。完成后编排层可以通过 Gateway API 调用任意 Agent。

## 依赖

- 00-数据库（agents 表的 seed 数据，用于校验 Agent ID 一致性）

## 文件清单

```
packages/openclaw/
├── src/
│   ├── constants.ts                 # 已有，确认配置正确
│   ├── gateway/
│   │   ├── index.ts                 # 已有，readConfig / writeConfig
│   │   ├── config.ts                # 已有
│   │   ├── health.ts                # 已有，checkGatewayHealth
│   │   └── restart.ts               # 已有，restartGateway
│   ├── agent/
│   │   ├── index.ts                 # 已有
│   │   ├── list.ts                  # 已有，listAgents / getAgent
│   │   └── config.ts                # 已有，updateAgentModel / toggleAgentEnabled
│   ├── workspace/
│   │   ├── index.ts                 # 已有
│   │   ├── read.ts                  # 已有
│   │   ├── write.ts                 # 已有
│   │   └── list.ts                  # 已有
│   ├── setup/
│   │   ├── index.ts                 # 已有
│   │   └── initialize.ts           # 已有，initializeTemplate
│   └── index.ts                     # 已有，barrel 导出
│
packages/templates/
├── src/
│   ├── types.ts                     # 需更新：StageType 枚举改为新的 6 阶段
│   ├── loader.ts                    # 已有
│   └── presets/
│       └── kaiwu-factory/           # 新建：开物局模板
│           ├── manifest.json
│           └── agents/
│               ├── youshang/        # SOUL.md + IDENTITY.md + TOOLS.md + HEARTBEAT.md
│               ├── shuike/
│               ├── zhengchen/
│               ├── zhangcheng/
│               ├── huashi/
│               ├── jiangren/
│               ├── shijian/
│               └── mingluo/
```

## 实现步骤

### Step 1：更新 templates 类型定义

文件：`packages/templates/src/types.ts`

将 StageType 枚举从旧的 `triage/planning/review/dispatch/execute/publish` 改为：

```ts
export const STAGE_TYPES = ["scout", "council", "architect", "builder", "inspector", "deployer"] as const
export type StageType = (typeof STAGE_TYPES)[number]
```

### Step 2：创建开物局模板

目录：`packages/templates/src/presets/kaiwu-factory/`

1. 创建 `manifest.json` — 内容严格按照 `Agent工作区设计/manifest.md`
2. 为 8 个 Agent 各创建 4 个文件：
   - `SOUL.md` — 从 `Agent工作区设计/{角色}/SOUL.md` 复制
   - `IDENTITY.md` — 从 `Agent工作区设计/{角色}/IDENTITY.md` 复制
   - `TOOLS.md` — 从 `Agent工作区设计/{角色}/TOOLS.md` 复制
   - `HEARTBEAT.md` — 从 `Agent工作区设计/{角色}/HEARTBEAT.md` 复制（空文件）

### Step 3：初始化模板到 OpenClaw

运行 `initializeTemplate("kaiwu-factory")`，验证：
- 8 个 workspace 目录创建（`~/.openclaw/workspace-{agentId}/`）
- 每个 workspace 下有 SOUL.md、IDENTITY.md、TOOLS.md、HEARTBEAT.md、AGENTS.md
- openclaw.json 中注册了 8 个 Agent 及其 permissions

### Step 4：创建结构化记忆目录

为每个 Agent 的 workspace 创建记忆文件结构：

```bash
for agent in youshang shuike zhengchen zhangcheng huashi jiangren shijian mingluo; do
  mkdir -p ~/.openclaw/workspace-$agent/memory/domain
  # 创建初始 MEMORY.md（从 Agent工作区设计/MEMORY.md 模板）
  # 创建空的 lessons.md / patterns.md / relationships.md
done
```

### Step 5：注册 3 个 Cron Job

```bash
# Cron #1：造物流更鼓
openclaw cron add \
  --name "造物流更鼓" \
  --cron "*/20 * * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "执行造物流 tick：检查当前造物令状态，推进一步。" \
  --no-deliver

# Cron #2：游商巡视
openclaw cron add \
  --name "游商巡视" \
  --cron "0 */2 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --agent youshang \
  --message "自由活动：检查物帖池预采风、扫描行业趋势、回访已上线器物。" \
  --no-deliver

# Cron #3：每日总结
openclaw cron add \
  --name "每日总结" \
  --cron "0 23 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "回顾今天所有局中人的工作，提炼经验写入记忆文件。" \
  --no-deliver
```

### Step 6：关闭 Gateway 内置心跳

在 `~/.openclaw/openclaw.json` 中设置：

```json5
{
  agents: {
    defaults: {
      heartbeat: { every: null }
    }
  }
}
```

### Step 7：配置 memory_search

在 `~/.openclaw/openclaw.json` 中配置混合搜索：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            enabled: true,
            vectorWeight: 0.7,
            textWeight: 0.3,
            temporalDecay: { enabled: true, halfLifeDays: 30 },
            mmr: { enabled: true, lambda: 0.7 }
          }
        }
      }
    }
  }
}
```

### Step 8：创建产出目录

```bash
mkdir -p ~/.openclaw/products
```

## 验收标准

- [ ] `openclaw doctor` 无报错
- [ ] `listAgents()` 返回 8 个 Agent，ID 与数据库 agents 表一致
- [ ] 每个 Agent 的 workspace 下有 SOUL.md / IDENTITY.md / TOOLS.md / HEARTBEAT.md / AGENTS.md / MEMORY.md
- [ ] `openclaw cron list` 显示 3 个 Cron Job
- [ ] Gateway 内置心跳已关闭
- [ ] `~/.openclaw/products/` 目录存在

## 参考文档

- `design/Agent工作区设计/manifest.md` — manifest.json 结构
- `design/Agent工作区设计/各角色/` — 8 个 Agent 的 workspace 文件
- `design/Agent工作区设计/AGENTS.md` — 共享工作协议
- `design/Agent工作区设计/MEMORY.md` — 记忆模板
- `design/流水线设计.md → Cron 架构` — 3 个 Cron Job 配置
- `design/记忆系统设计.md → 检索优化` — memory_search 配置
