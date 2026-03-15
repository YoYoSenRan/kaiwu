# 技术选型

## 技术栈

| 层       | 技术                                      | 说明                                               |
| -------- | ----------------------------------------- | -------------------------------------------------- |
| 框架     | Next.js 16 (App Router)                   | Server Component 为主，交互组件标记 `'use client'` |
| UI       | React 19 + Tailwind CSS 4 + shadcn/ui     | 移动优先，响应式                                   |
| 状态管理 | Zustand                                   | 客户端全局状态（Gateway 连接、实时数据）           |
| 图表     | Recharts                                  | 成本趋势、Token 分布、Pipeline 可视化              |
| 数据库   | Drizzle ORM + PostgreSQL                  | Server Component 直查，零 API 中间层               |
| 实时推送 | SSE（DB 变更）+ WebSocket（Gateway 事件） | 双通道实时                                         |
| 主题     | next-themes                               | 系统/明/暗三档切换                                 |

## 关键决策

### 为什么用 SSE 而不是全走 WebSocket？

- WebSocket 连的是 OpenClaw Gateway，传输的是 Agent 运行时事件
- DB 变更（如 production 状态更新）需要另一个通道通知前端
- SSE 比 WebSocket 更轻量，不需要维护连接状态，浏览器原生支持自动重连
- 两个通道职责清晰：WebSocket = Gateway 实时数据，SSE = DB 变更通知

### 为什么用 Zustand 而不是 Context？

- Gateway WebSocket 状态是全局的，多个组件需要订阅
- Zustand 支持 selector 订阅，避免不必要的 re-render
- 与 WebSocket 回调集成更简洁（store 可在 React 外部更新）
- Edict 和 Mission Control 都用 Zustand，经过验证

### 为什么 Server Component 直查 DB？

- Next.js App Router 的核心优势：Server Component 直接访问数据源
- 省掉 API 中间层，减少代码量和延迟
- SSR 直出内容，无数据闪烁
- 分页/筛选用 URL searchParams 驱动，天然支持刷新和书签
