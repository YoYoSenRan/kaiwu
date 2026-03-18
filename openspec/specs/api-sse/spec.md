## ADDED Requirements

### Requirement: SSE 端点可连接

`GET /api/pipeline/events/stream` SHALL 返回 `Content-Type: text/event-stream` 的 SSE 流。

#### Scenario: 建立连接
- **WHEN** 客户端请求 SSE 端点
- **THEN** 返回 200，Content-Type 为 text/event-stream，连接保持打开

### Requirement: 事件实时推送

当 events 表写入新记录时，SSE 端点 SHALL 将事件推送给所有已连接的客户端。

每个 SSE 事件 MUST 包含 `id` 字段（events.seq 值）和 `data` 字段（JSON）。

#### Scenario: 接收实时事件
- **WHEN** 编排层写入一条 event 并 publish 到 EventBus
- **THEN** 所有已连接的 SSE 客户端在 2 秒内收到该事件

### Requirement: Last-Event-ID 断线恢复

SSE 端点 SHALL 支持 `Last-Event-ID` header，断线恢复时补推缺失的事件。

#### Scenario: 断线恢复
- **WHEN** 客户端重连并携带 `Last-Event-ID: 42`
- **THEN** 服务端从 events 表查询 `seq > 42` 的记录，依次推送

#### Scenario: 断线超过 5 分钟
- **WHEN** 客户端断线超过 5 分钟后重连
- **THEN** 不补推历史事件，客户端应全量刷新页面数据

### Requirement: EventBus 内存实现

`packages/domain/src/events/bus.ts` SHALL 提供 publish/subscribe 接口。`packages/domain/src/events/emitter.ts` SHALL 提供 `emitEvent()` 函数（写入 events 表 + publish 到 bus）。SSE 端点从 `@kaiwu/domain` 导入 EventBus 并 subscribe。

#### Scenario: 发布订阅
- **WHEN** 调用 eventBus.publish(event)
- **THEN** 所有通过 eventBus.subscribe(callback) 注册的回调被调用
