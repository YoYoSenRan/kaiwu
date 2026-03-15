# Gateway 实时事件

## 概述

WebSocket 连接成功后，OpenClaw Gateway 持续推送实时事件。Console 订阅这些事件更新 Zustand store，驱动 UI 刷新。

## 事件类型

| 事件            | 说明                             | Console 处理                      |
| --------------- | -------------------------------- | --------------------------------- |
| `tick`          | Agent 会话快照更新               | 更新 Agent 在线状态、当前会话列表 |
| `log`           | Agent/系统日志                   | 写入日志缓冲，供事件日志页面展示  |
| `agent.status`  | Agent 状态变更（在线/离线/忙碌） | 更新 Agent 心跳列表、状态指示灯   |
| `chat.message`  | Agent 间消息                     | 暂不处理（未来聊天面板）          |
| `notification`  | 系统通知                         | 显示 toast 或通知角标             |
| `tool.stream`   | 工具执行实时输出                 | 暂不处理（未来日志详情）          |
| `exec.approval` | 执行审批请求                     | 暂不处理（未来审批面板）          |

## 事件帧格式

```json
{ "type": "event", "method": "tick", "params": { "sessions": [{ "id": "session-123", "agentId": "zhongshu", "status": "active", "startedAt": "2026-03-15T10:00:00Z" }] } }
```

## Zustand Store 处理

```ts
// WebSocket onMessage 回调中
function handleGatewayEvent(event: GatewayEvent): void {
  switch (event.method) {
    case "tick":
      updateAgentHeartbeats(event.params?.sessions)
      break
    case "agent.status":
      updateSingleAgent(event.params?.agentId, event.params?.status)
      break
    case "log":
      appendLog(event.params)
      break
    case "notification":
      showNotification(event.params)
      break
  }
}
```

## 事件序列号

Gateway 为每个事件附加递增序列号。Console 跟踪序列号，检测是否有遗漏：

- 序列号连续 → 正常
- 检测到间隙 → 日志警告，请求全量同步

## 优先级

第一期只处理 `tick` 和 `agent.status`（Dashboard 和 Agent 管理需要）。其余事件在对应功能模块开发时再接入。
