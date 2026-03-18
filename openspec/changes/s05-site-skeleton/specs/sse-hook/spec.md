## ADDED Requirements

### Requirement: useSSE hook

`apps/site/src/lib/hooks/useSSE.ts` SHALL 提供 SSE 连接 hook，返回 `{ lastEvent, isConnected }`。

功能：
- 使用 EventSource 连接指定 URL
- 浏览器原生自动重连
- 支持 Last-Event-ID 断线恢复
- 组件卸载时自动关闭连接

#### Scenario: 连接成功
- **WHEN** 组件挂载并调用 useSSE("/api/pipeline/events/stream")
- **THEN** isConnected 为 true，收到事件时 lastEvent 更新

#### Scenario: 断线重连
- **WHEN** SSE 连接断开
- **THEN** isConnected 变为 false，浏览器自动重连，重连后 isConnected 恢复为 true
