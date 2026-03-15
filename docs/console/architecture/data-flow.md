# 数据流

## 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│  Browser（Next.js Client）                                    │
│                                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ Zustand     │  │ SSE 订阅     │  │ WebSocket 连接    │    │
│  │ Store       │←─│ /api/events  │  │ OpenClaw Gateway  │    │
│  │             │  │ (DB 变更)    │  │ (ws://host:18789) │    │
│  └──────┬──────┘  └──────────────┘  └───────────────────┘    │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ React 组件树                                        │      │
│  │ Server Component（初始数据）+ Client Component（交互）│      │
│  └─────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
         │ Server Component                    │ WebSocket
         ▼                                     ▼
┌─────────────────┐                  ┌──────────────────┐
│  PostgreSQL     │                  │  OpenClaw Gateway │
│  (Drizzle ORM)  │                  │  (Agent 运行时)   │
│                 │                  │  - Agent 心跳     │
│  - themes       │                  │  - 会话状态       │
│  - pipelines    │                  │  - 执行日志       │
│  - agents       │                  │  - Token 消耗     │
│  - productions  │                  │                    │
│  - events       │                  │                    │
└─────────────────┘                  └──────────────────┘
```

## 数据获取策略

| 场景             | 方式                                | 说明                            |
| ---------------- | ----------------------------------- | ------------------------------- |
| 页面初始加载     | Server Component 直查 DB            | SSR 直出，无闪烁                |
| 分页/筛选        | URL searchParams + Server Component | 可刷新、可书签                  |
| DB 数据变更通知  | SSE `/api/events`                   | 轻量推送，触发客户端 revalidate |
| Gateway 实时事件 | WebSocket                           | Agent 状态、日志流、心跳        |
| 数据变更操作     | Server Action                       | 表单提交、状态流转              |

## 状态管理分层

```
URL searchParams     → 分页、筛选、当前标签（持久化，可分享）
Zustand Store        → Gateway 连接状态、实时 Agent 数据、WebSocket 事件缓冲
React Server State   → DB 数据（Server Component props 传递）
localStorage         → Gateway 认证凭据（Token、设备标识）
```
