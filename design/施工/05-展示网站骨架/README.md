# 04 — 展示网站骨架

## 目标

展示网站可运行，全局布局、设计系统、路由结构、SSE 连接就绪。完成后可以在浏览器中看到空的但有视觉风格的页面框架。

## 依赖

- 00-数据库（查询 agents 表展示状态）

## 文件清单

```
apps/site/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # 根布局（字体、meta、主题、导航）
│   │   ├── page.tsx                 # 首页（占位）
│   │   ├── stories/
│   │   │   ├── page.tsx             # 造物志列表（占位）
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # 造物志详情（占位）
│   │   │       └── flow/page.tsx    # 对话流（占位）
│   │   ├── agents/
│   │   │   ├── page.tsx             # 局中人总览（占位）
│   │   │   └── [id]/page.tsx        # 局中人详情（占位）
│   │   ├── trends/page.tsx          # 物帖墙（占位）
│   │   ├── pipeline/page.tsx        # 造物坊（占位）
│   │   ├── behind/page.tsx          # 内坊（占位）
│   │   ├── about/page.tsx           # 关于（占位）
│   │   └── api/
│   │       └── events/stream/route.ts  # SSE（02-API层已实现）
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx           # 顶部导航
│   │   │   ├── Footer.tsx           # 页脚
│   │   │   └── MobileNav.tsx        # 移动端导航
│   │   └── ui/                      # shadcn/ui 基础组件
│   ├── lib/
│   │   ├── utils.ts                 # cn() 等工具
│   │   ├── fonts.ts                 # 字体配置
│   │   └── hooks/
│   │       └── useSSE.ts            # SSE 连接 hook
│   └── styles/
│       └── globals.css              # UnoCSS 全局样式 + CSS 变量
├── uno.config.ts                    # UnoCSS 主题色配置
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 实现步骤

### Step 1：项目初始化

1. 确认 apps/site 的 Next.js + UnoCSS 配置
2. 安装 shadcn/ui：`npx shadcn@latest init`
3. 配置 `@kaiwu/db` 和 `@kaiwu/ui` 的 workspace 引用

### Step 2：设计系统 — UnoCSS 主题

文件：`uno.config.ts` + `src/styles/globals.css`

按 `世界观.md → 色彩` 配置 CSS 变量：

```css
:root {
  --ink: #0a0a0f;           /* 墨色 — 主背景 */
  --paper: #faf8f5;         /* 宣纸色 — 浅色背景 */
  --cinnabar: #c23b22;      /* 朱砂红 — 强调色 */
  --gold: #c9a96e;          /* 鎏金 — 辅助强调 */
  --celadon: #5b9a8b;       /* 青瓷绿 — 成功/已开物 */
  --kiln: #d4833c;          /* 窑火橙 — 进行中 */
  --ash: #6b6b6b;           /* 枯墨灰 — 封存 */
  --bone: #e8e4de;          /* 浅灰白 — 正文 */
}
```

字体配置按 `世界观.md → 字体`：
- 标题：Noto Serif SC（东方气质）
- 正文：Noto Sans SC / 鸿蒙字体
- 等宽：JetBrains Mono

### Step 3：全局布局

文件：`src/app/layout.tsx`

- 字体加载（next/font）
- meta 标签（title、description、OG）
- 主题 provider（next-themes）
- 导航栏 + 页脚

文件：`src/components/layout/Navbar.tsx`

导航项按 `界面设计/全局布局.md`：

```
首页        /
造物志      /stories
局中人      /agents
物帖墙      /trends
造物坊      /pipeline
内坊        /behind
关于        /about
```

### Step 4：空路由页面

为每个路由创建占位页面，统一格式：

```tsx
export default function StoriesPage() {
  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold font-display">造物志</h1>
      <p className="mt-2 text-muted-foreground">施工中...</p>
    </div>
  )
}

export const metadata = { title: "造物志 | 开物局" }
```

### Step 5：SSE 连接 Hook

文件：`src/lib/hooks/useSSE.ts`

```ts
export function useSSE(url: string) {
  // EventSource 连接
  // 自动重连（浏览器原生）
  // Last-Event-ID 断线恢复
  // 返回 { lastEvent, isConnected }
}
```

### Step 6：基础 UI 组件

用 shadcn/ui 安装常用组件：

```bash
npx shadcn@latest add button card badge separator avatar tooltip
```

## 验收标准

- [ ] `pnpm dev:site` 启动无报错
- [ ] 浏览器访问所有路由（/, /stories, /agents, /trends, /pipeline, /behind, /about）均有页面
- [ ] 导航栏在所有页面正确显示，当前页高亮
- [ ] 移动端导航正常（汉堡菜单）
- [ ] 暗色模式切换正常
- [ ] CSS 变量（朱砂红、墨色、鎏金等）在页面上可见
- [ ] SSE hook 可连接 `/api/events/stream`
- [ ] `pnpm typecheck` 通过

## 参考文档

- `design/世界观.md → 视觉调性` — 色彩、字体、视觉元素
- `design/界面设计/全局布局.md` — 导航结构、响应式断点
- `design/界面设计/设计系统.md` — 组件样式规格
- `design/展示网站设计.md → 页面结构` — 路由列表
- `design/技术架构.md → 实时推送` — SSE 设计
