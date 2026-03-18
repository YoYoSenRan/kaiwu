## Context

`packages/openclaw` 和 `packages/templates` 已有部分代码（gateway 连接、agent 查询、workspace 读写、模板加载）。本阶段在此基础上创建开物局专用模板，并部署到 OpenClaw Gateway。

OpenClaw Gateway 是独立运行的进程，通过 CLI 和 JSON 配置文件管理。Agent workspace 是文件系统上的目录。

## Goals / Non-Goals

**Goals:**

- 8 个 Agent 的 workspace 在 Gateway 中就位，可被调用
- 3 个 Cron Job 注册完成，可按计划触发
- memory_search 配置为混合搜索模式
- Gateway 内置心跳关闭（由编排层的更鼓接管）

**Non-Goals:**

- 不精调 Agent 的 SOUL.md prompt（属于各阶段施工时精调）
- 不实现编排层逻辑（属于 s04-编排层）
- 不实现 Agent 数据交互 tool（属于 s03-API层）

## Decisions

### D1: 模板文件直接从设计文档复制

8 个 Agent 的 SOUL.md / IDENTITY.md / TOOLS.md 内容直接从 `design/Agent工作区设计/各角色/` 复制。后续各阶段施工时再精调。HEARTBEAT.md 初始为空（由编排层动态写入）。

### D2: Cron Job 用 --no-deliver 模式

3 个 Cron 都设置 `--no-deliver`，意味着 cron 触发时不直接发消息给 Agent，而是由编排层的 tick 逻辑接管。这样编排层可以控制调度策略。

### D3: 保留 Gateway 内置心跳

原计划关闭（`heartbeat.every: null`），实际验证后决定保留默认 30m 心跳。原因：OpenClaw 不支持禁用心跳；所有 Agent 的 HEARTBEAT.md 仅含注释，心跳触发不会产生业务操作；心跳（健康检查）与更鼓（造物流调度）职责不同，互不干扰。

## Risks / Trade-offs

- **OpenClaw 版本兼容**：openclaw.json 的配置格式可能随版本变化。→ 使用已有的 `packages/openclaw` 封装层操作，不直接手写 JSON。
- **Cron 时区**：Cron Job 使用 Asia/Shanghai 时区，部署到其他时区的服务器时需注意。→ 通过 --tz 参数显式指定。
- **workspace 文件冲突**：如果 Gateway 已有同名 workspace，initializeTemplate 可能覆盖。→ 初始化前检查，有冲突时提示用户。
