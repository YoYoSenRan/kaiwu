## Context

数据库 schema 已就位（s01），OpenClaw Gateway 已配置（s02）。本阶段在 apps/site 中实现 API 层，同时在 packages/openclaw 中封装 Tool，让 Agent 可以通过 tool 调用读写数据。

API 端点设计已在 `design/Agent工作区设计/API.md` 中完整定义。

## Goals / Non-Goals

**Goals:**

- 所有读取接口可通过 curl 测试
- 所有写入接口有 Zod 校验，非法请求返回 400
- SSE 端点可连接，支持 Last-Event-ID 断线恢复
- 9 个 OpenClaw Tool 封装完成，Agent 可直接调用
- MVP 阶段 API 监听 localhost，用 X-Agent-Id header 标识调用者

**Non-Goals:**

- 不实现 HMAC session token 认证（属于生产阶段）
- 不实现速率限制（属于打磨阶段）
- 不实现 memories Route Handler（MVP 走 OpenClaw 原生 memory_search）
- 不实现编排层逻辑（属于 s04）

## Decisions

### D1: API 路由放在 apps/site

API 端点放在 `apps/site/src/app/api/pipeline/`，与展示网站同进程。MVP 阶段不需要独立的 API 服务。技术架构.md 确认了这个方案。

### D2: MVP 认证 — X-Agent-Id header

同机部署，API 监听 localhost，用 `X-Agent-Id` header 标识调用者即可。不做 HMAC 签名。

### D3: SSE 用 events.seq 作为 Last-Event-ID

events 表新增了 `seq SERIAL UNIQUE` 自增列。SSE 事件的 `id` 字段用 seq 值，断线恢复时通过 `WHERE seq > lastEventId` 补推。

### D4: getMyMemories 走 OpenClaw 原生 API

MVP 阶段记忆存在 OpenClaw workspace 文件中，`getMyMemories` Tool 直接调用 OpenClaw Gateway 的 memory_search API，不经过自建 Route Handler。

> getMyMemories tool 函数将移除，Agent 直接使用 OpenClaw 内置 memory_search 工具（属于 group:memory）。

### D5: EventBus 放在 packages/domain

EventBus 定义在 `packages/domain/src/events/`（bus.ts + emitter.ts）。编排层是事件的生产者，EventBus 属于核心领域逻辑。SSE 端点从 `@kaiwu/domain` 导入 EventBus 并 subscribe。不引入 Redis Pub/Sub（MVP 单机够用）。

## Risks / Trade-offs

- **EventBus 内存模式**：进程重启丢失订阅。→ SSE 客户端自动重连 + Last-Event-ID 补推，不丢数据。
- **Zod schema 与 Agent 输出格式同步**：Agent TOOLS.md 中定义的输出格式需要与 Zod schema 保持一致。→ schema 文件注释标注来源文档。
- **SSE 连接数**：大量并发访客可能耗尽连接。→ MVP 阶段不考虑，打磨阶段加连接池限制。

### D6: 工具通过 OpenClaw Plugin 注册

- `packages/openclaw/src/tools/` 保留为 HTTP client 底层（编排层也能复用）
- 新增 `packages/openclaw/src/plugin/` 作为 Gateway 适配层
- 每个工具用 `api.registerTool()` 注册，参数用 TypeBox JSON Schema
- 工具名 snake_case（OpenClaw 惯例）
- submit 类工具按角色具名注册（submit_scout_report 等），各自有独立 Schema
- 通过 `agents.list[].tools.allow` 按角色分配工具访问权限

### D7: getMyMemories 移除，改用内置 memory_search

- OpenClaw 内置 `memory_search` 属于 `group:memory`，通过 plugin slot 管理
- 删除自建的 getMyMemories.ts
- 工具从 9 个减为 8 个

### D8: workspace 同步脚本

- `scripts/sync-workspaces.ts`：读取 preset 模板，同步到 OpenClaw workspace 目录
- 支持 --dry-run 和 --workspace-root 参数
- 注册为 pnpm sync:openclaw
- 同时生成 Gateway 配置模板（agents.list + plugins + tools.allow）

### D9: POST /phases/:phaseId/output 按阶段类型校验（勘误）

- 原实现用 `z.record(z.string(), z.unknown())` 接收所有阶段产出，等于不校验
- 修复：先查 `phase.type`，用 type→schema 映射表（scout→scoutReportSchema、verdict→verdictSchema...）选择对应 Schema
- debate 和 build 阶段走独立端点，不经过此端点
- 需要新增 reviewSchema（试剑输出）
- Route Handler 的 Zod 校验是最终防线，Plugin 层的 TypeBox Schema 是 Agent 侧参数描述

### D10: SSE 断线恢复改查 lastEventId 本身时间（勘误）

- 原实现查 `seq > lastEventId` 的第一条新事件时间，逻辑错误
- 修复：查 `seq = lastEventId` 的事件的 `created_at`，判断距今是否超 5 分钟
- lastEventId 对应事件不存在时（已清理），视为过期
