## 1. 设计系统

- [ ] 1.1 配置 `apps/site/src/styles/globals.css`：定义 CSS 变量（ink/paper/cinnabar/gold/celadon/kiln/ash/bone）+ 映射到 shadcn/ui 语义变量 — 验收：暗色/浅色模式变量正确
- [ ] 1.2 配置 `apps/site/uno.config.ts`：注册主题色到 UnoCSS theme — 验收：text-cinnabar、bg-ink 等类名可用
- [ ] 1.3 创建 `apps/site/src/lib/fonts.ts`：next/font 加载 Noto Serif SC + Noto Sans SC + JetBrains Mono — 验收：页面字体正确渲染

## 2. 全局布局

- [ ] 2.1 实现 `apps/site/src/app/layout.tsx`：字体加载 + meta + ThemeProvider + Navbar + Footer — 验收：所有页面有统一布局
- [ ] 2.2 实现 `apps/site/src/components/layout/Navbar.tsx`：Logo + 5 导航项 + 更鼓指示器（静态）+ 主题切换，sticky + backdrop-blur — 验收：当前页高亮，主题切换正常
- [ ] 2.3 实现 `apps/site/src/components/layout/MobileNav.tsx`：< 768px 汉堡菜单 — 验收：移动端导航展开/收起正常
- [ ] 2.4 实现 `apps/site/src/components/layout/Footer.tsx`：品牌 + 导航链接（含关于）+ 版权 — 验收：页脚在所有页面显示

## 3. 路由占位页面

- [ ] 3.1 创建 `apps/site/src/app/page.tsx`（首页占位）— 验收：/ 可访问
- [ ] 3.2 创建 `apps/site/src/app/stories/page.tsx`（造物志列表占位）— 验收：/stories 可访问
- [ ] 3.3 创建 `apps/site/src/app/stories/[id]/page.tsx`（造物志详情占位）— 验收：/stories/xxx 可访问
- [ ] 3.4 创建 `apps/site/src/app/stories/[id]/flow/page.tsx`（对话流占位）— 验收：/stories/xxx/flow 可访问
- [ ] 3.5 创建 `apps/site/src/app/agents/page.tsx`（局中人总览占位）— 验收：/agents 可访问
- [ ] 3.6 创建 `apps/site/src/app/agents/[id]/page.tsx`（局中人详情占位）— 验收：/agents/xxx 可访问
- [ ] 3.7 创建 `apps/site/src/app/trends/page.tsx`（物帖墙占位）— 验收：/trends 可访问
- [ ] 3.8 创建 `apps/site/src/app/pipeline/page.tsx`（造物坊占位）— 验收：/pipeline 可访问
- [ ] 3.9 创建 `apps/site/src/app/behind/page.tsx`（内坊占位）— 验收：/behind 可访问
- [ ] 3.10 创建 `apps/site/src/app/about/page.tsx`（关于占位）— 验收：/about 可访问

## 4. SSE Hook

- [ ] 4.1 创建 `apps/site/src/lib/hooks/useSSE.ts`：EventSource 连接 + 自动重连 + Last-Event-ID + 返回 { lastEvent, isConnected } — 验收：可连接 /api/pipeline/events/stream

## 5. 基础 UI 组件

- [ ] 5.1 安装 shadcn/ui 常用组件（button/card/badge/separator/avatar/tooltip）— 验收：组件可导入使用

## 6. 验证

- [ ] 6.1 `pnpm dev:site` 启动无报错
- [ ] 6.2 所有路由浏览器可访问
- [ ] 6.3 暗色/浅色模式切换正常
- [ ] 6.4 移动端导航正常
- [ ] 6.5 `pnpm typecheck` 通过
