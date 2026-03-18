## Why

Agent 需要通过 tool 调用读写数据库（获取属性、提交产出、写日志），展示网站需要通过 SSE 接收实时事件。API 层是 Agent 和展示网站与数据库之间的桥梁，没有它编排层和前端都无法工作。

需求来源：`design/施工/03-API层/README.md`

依赖的前置模块：`s01-database-schema`（表定义和 db 实例）、`s02-openclaw-integration`（getMyMemories 需要 Gateway memory_search 配置）

## What Changes

- 在 `apps/site/src/app/api/pipeline/` 下实现 Route Handlers（读取 + 写入接口）
- 在 `apps/site/src/app/api/pipeline/events/stream/` 实现 SSE 端点（含 Last-Event-ID 断线恢复）
- 在 `apps/site/src/lib/` 下创建 API 工具函数（apiHandler、event-bus、Zod schemas）
- 在 `packages/openclaw/src/tools/` 下封装 9 个 OpenClaw Tool

## Capabilities

### New Capabilities

- `api-read`: Agent 数据读取接口（agents 列表/stats、project context、debates、tasks）
- `api-write`: Agent 数据写入接口（phase output、debate speech、task complete、agent log）
- `api-sse`: SSE 实时推送端点（EventBus + Last-Event-ID 断线恢复）
- `openclaw-tools`: 9 个 OpenClaw Tool 封装（getMyStats、getProjectContext、getDebateHistory、getMyTasks、getMyMemories、submitOutput、submitDebateSpeech、completeTask、writeLog）
- `openclaw-plugin`: OpenClaw Plugin 注册层（8 个自建 Tool 通过 api.registerTool 注册 + TypeBox JSON Schema，5 个 submit 按角色具名注册；getMyMemories 移除改用内置 memory_search）
- `sync-script`: workspace 同步脚本（模板 → OpenClaw workspace 目录同步 + Gateway 配置模板）

### Modified Capabilities

（无）

## Impact

- 新增 `apps/site/src/app/api/pipeline/` 下约 10 个 route.ts 文件
- 新增 `apps/site/src/lib/api-utils.ts`、`event-bus.ts`、`schemas/` 目录
- 新增 `packages/openclaw/src/tools/` 下 9 个 tool 文件 + index.ts
- 依赖 `@kaiwu/db` 的 schema 和 db 实例
- 依赖 zod 做请求校验
- 新增 `packages/openclaw/src/plugin/` 目录（注册入口 + 插件清单）
- 新增 `scripts/sync-workspaces.ts`
- 删除 `packages/openclaw/src/tools/getMyMemories.ts`
- 新增 `@sinclair/typebox` 依赖
