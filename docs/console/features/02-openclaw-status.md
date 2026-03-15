# OpenClaw 状态面板

## 定位

展示本机 OpenClaw 运行时的健康状况：Gateway 连接、Agent 心跳、系统资源。这是运维视角的入口。

## 展示位置

不单独占一个路由。集成在两处：

1. **Dashboard 首页**：Gateway 状态卡片（简略）
2. **Header 右侧**：状态指示灯，点击弹出 Popover 详情

## Header 状态指示灯

```tsx
// components/layout/GatewayIndicator.tsx
```

```
┌─────────────────────────┐
│  ● 已连接                │  ← 点击展开 Popover
└─────────────────────────┘

展开后：
┌─────────────────────────────┐
│  OpenClaw Gateway            │
│                               │
│  状态    ● 已连接             │
│  地址    127.0.0.1:18789     │
│  协议    v3                   │
│  延迟    12ms                 │
│  运行    3天14小时            │
│                               │
│  Agent 心跳                   │
│  taizi     ● 在线  刚刚      │
│  zhongshu  ● 忙碌  执行中    │
│  menxia    ○ 离线  3h前      │
│  ...                          │
│                               │
│  [断开连接]  [重新连接]       │
└─────────────────────────────┘
```

## 数据源

所有数据来自 WebSocket 连接：

| 数据              | 来源                       |
| ----------------- | -------------------------- |
| 连接状态          | `useGateway()` store       |
| 延迟              | ping/pong RTT              |
| Gateway 版本/协议 | 握手响应                   |
| Agent 心跳        | Gateway `tick` 事件        |
| 运行时长          | Gateway info（连接时获取） |

## 状态指示灯样式

```tsx
const STATUS_STYLES = {
  connected: "bg-green-500 shadow-green-500/50 shadow-sm animate-pulse",
  connecting: "bg-yellow-500 animate-spin",
  reconnecting: "bg-yellow-500 animate-pulse",
  disconnected: "bg-red-500",
} as const
```

显示规则：

- `connected` → 绿色圆点 + 微弱 pulse
- `connecting` / `reconnecting` → 黄色 + 旋转或 pulse + 「重连中 (3/10)」
- `disconnected` → 红色 + 点击跳转 `/setup`

## 组件

```
components/
├── layout/
│   └── GatewayIndicator.tsx      ← Header 中的状态灯 + Popover
└── gateway/
    ├── GatewayPopover.tsx        ← 展开后的详情面板
    └── AgentHeartbeatList.tsx    ← Agent 心跳列表
```

## Agent 心跳数据结构

```ts
// 由 Gateway tick 事件推送，存入 Zustand store
interface AgentHeartbeat {
  id: string
  status: "online" | "offline" | "busy"
  lastSeen: Date
  currentSession?: string
}

// stores/gateway.ts 中扩展
interface GatewayState {
  // ...existing
  agentHeartbeats: Map<string, AgentHeartbeat>
  updateAgentHeartbeat: (id: string, heartbeat: AgentHeartbeat) => void
}
```

## 响应式

Popover 在移动端变为全屏 Sheet（从底部滑入），桌面端为 Popover（从指示灯下方弹出）。
