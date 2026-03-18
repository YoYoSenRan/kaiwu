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

### D5: EventBus — 内存发布/订阅

简单的内存 EventBus，编排层写入 events 表后同时 publish。SSE 端点 subscribe 后推送给客户端。不引入 Redis Pub/Sub（MVP 单机够用）。

## Risks / Trade-offs

- **EventBus 内存模式**：进程重启丢失订阅。→ SSE 客户端自动重连 + Last-Event-ID 补推，不丢数据。
- **Zod schema 与 Agent 输出格式同步**：Agent TOOLS.md 中定义的输出格式需要与 Zod schema 保持一致。→ schema 文件注释标注来源文档。
- **SSE 连接数**：大量并发访客可能耗尽连接。→ MVP 阶段不考虑，打磨阶段加连接池限制。
