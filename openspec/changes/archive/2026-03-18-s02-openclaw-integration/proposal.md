## Why

编排层需要通过 OpenClaw Gateway 调用 Agent，但 Gateway 还没有开物局的 Agent 配置。8 个局中人的 workspace 文件（SOUL.md / TOOLS.md 等）、3 个 Cron Job、记忆搜索配置都需要部署到位，编排层才能开始调度。

需求来源：`design/施工/02-OpenClaw集成/README.md`

依赖的前置模块：`s01-database-schema`（agents 表 seed 数据，用于校验 Agent ID 一致性）

## What Changes

- 更新 `packages/templates/src/types.ts`：StageType 枚举改为新的 6 阶段
- 创建开物局模板 `packages/templates/src/presets/kaiwu-factory/`（manifest.json + 8 个 Agent 的 workspace 文件）
- 初始化模板到 OpenClaw Gateway（8 个 workspace 目录）
- 为每个 Agent 创建结构化记忆目录
- 注册 3 个 Cron Job（造物流更鼓 / 游商巡视 / 每日总结）
- 关闭 Gateway 内置心跳
- 配置 memory_search（混合搜索 + 衰减 + MMR）
- 创建产出目录 `~/.openclaw/products/`

## Capabilities

### New Capabilities

- `openclaw-template`: 开物局模板（manifest.json + 8 个 Agent workspace 文件集）
- `openclaw-cron`: 3 个 Cron Job 注册与配置
- `openclaw-gateway-config`: Gateway 配置（心跳关闭、memory_search、产出目录）

### Modified Capabilities

（无）

## Impact

- 修改 `packages/templates/src/types.ts`
- 新增 `packages/templates/src/presets/kaiwu-factory/` 目录（manifest.json + 8×4 个 workspace 文件）
- 运行时修改 `~/.openclaw/` 目录（workspace 创建、openclaw.json 配置、cron 注册）
- 依赖 OpenClaw Gateway 已安装并可运行
