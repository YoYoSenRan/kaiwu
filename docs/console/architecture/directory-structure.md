# 目录结构

```
apps/console/src/
├── app/
│   ├── layout.tsx                  # 根布局（ThemeProvider + 全局样式）
│   ├── (auth)/                     # 认证相关路由组
│   │   ├── login/page.tsx          # 登录页
│   │   └── setup/page.tsx          # 首次 Gateway 连接引导
│   ├── (dashboard)/                # 主面板路由组
│   │   ├── layout.tsx              # Dashboard 布局（Sidebar + Header + Content）
│   │   ├── page.tsx                # 首页 Dashboard
│   │   ├── productions/            # 生产看板
│   │   ├── agents/                 # Agent 管理
│   │   ├── proposals/              # 选题池
│   │   ├── templates/              # 模板管理
│   │   ├── costs/                  # 成本追踪
│   │   ├── events/                 # 事件日志
│   │   ├── publications/           # 发布管理
│   │   └── settings/               # 系统设置
│   └── api/
│       └── events/route.ts         # SSE 推送端点
├── components/
│   ├── layout/                     # Sidebar, Header, MobileNav
│   ├── ui/                         # shadcn 组件
│   ├── dashboard/                  # Dashboard 首页组件
│   ├── productions/                # 看板、卡片、时间线
│   ├── agents/                     # Agent 卡片、状态指示器
│   ├── gateway/                    # 连接状态、引导流程
│   └── costs/                      # 图表、报表
├── hooks/
│   ├── useGateway.ts               # Gateway WebSocket 连接管理
│   ├── useServerEvents.ts          # SSE 订阅
│   └── useThemeConfig.ts           # 当前模板主题配置
├── stores/
│   └── gateway.ts                  # Zustand: Gateway 状态、Agent 实时数据
├── lib/
│   ├── utils.ts                    # cn() 等工具
│   ├── request.ts                  # HTTP 请求封装
│   └── gateway/
│       ├── websocket.ts            # WebSocket 客户端
│       └── credentials.ts          # 凭据缓存管理
└── types/
    ├── gateway.ts                  # Gateway 消息类型
    └── production.ts               # 生产流程类型
```

## 路由组说明

| 路由组        | 用途               | Layout                     |
| ------------- | ------------------ | -------------------------- |
| `(auth)`      | 登录、Gateway 引导 | 居中全屏，无 Sidebar       |
| `(dashboard)` | 所有业务页面       | Sidebar + Header + Content |

## 文件命名约定

| 类型  | 命名             | 示例                     |
| ----- | ---------------- | ------------------------ |
| 页面  | `page.tsx`       | `productions/page.tsx`   |
| 布局  | `layout.tsx`     | `(dashboard)/layout.tsx` |
| 查询  | `queries.ts`     | `productions/queries.ts` |
| 操作  | `actions.ts`     | `productions/actions.ts` |
| 组件  | `PascalCase.tsx` | `KanbanBoard.tsx`        |
| Hook  | `camelCase.ts`   | `useGateway.ts`          |
| Store | `camelCase.ts`   | `gateway.ts`             |
| 类型  | `camelCase.ts`   | `gateway.ts`             |
| 常量  | `constants.ts`   | `constants.ts`           |
