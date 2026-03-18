## Why

展示网站是开物局面向用户的唯一入口。需要先搭好骨架——全局布局、设计系统（色彩/字体/组件）、路由结构、SSE 连接——后续的页面内容才有地方放。

需求来源：`design/施工/05-展示网站骨架/README.md`

依赖的前置模块：`s01-database-schema`（查询 agents 表展示状态）

## What Changes

- 实现全局布局（layout.tsx + Navbar + Footer + MobileNav）
- 配置设计系统（CSS 变量、UnoCSS 主题、字体、next-themes 暗色模式）
- 创建所有页面的空路由占位（/, /stories, /agents, /trends, /pipeline, /behind, /about）
- 实现 SSE 连接 hook（useSSE）
- 安装 shadcn/ui 基础组件

## Capabilities

### New Capabilities

- `design-system`: CSS 变量（墨色/朱砂红/鎏金等）+ UnoCSS 主题配置 + 字体加载 + 暗色模式
- `global-layout`: 根布局 + 顶部导航（5 项 + Logo + 更鼓 + 主题切换）+ 页脚 + 移动端导航
- `page-routes`: 7 个页面路由占位（含嵌套路由 stories/[id]、agents/[id]）
- `sse-hook`: 前端 SSE 连接 hook（EventSource + Last-Event-ID + 断线状态）

### Modified Capabilities

（无）

## Impact

- 修改 `apps/site/src/app/layout.tsx`（根布局）
- 修改 `apps/site/src/styles/globals.css`（CSS 变量）
- 修改 `apps/site/uno.config.ts`（主题色）
- 新增 `apps/site/src/components/layout/`（Navbar、Footer、MobileNav）
- 新增 `apps/site/src/lib/fonts.ts`、`hooks/useSSE.ts`
- 新增约 10 个 page.tsx 占位文件
- 安装 shadcn/ui 基础组件（button、card、badge 等）
