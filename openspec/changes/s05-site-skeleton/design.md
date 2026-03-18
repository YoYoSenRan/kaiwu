## Context

apps/site 已在 s00 中初始化（Next.js 16 + UnoCSS + shadcn/ui 基础配置）。本阶段填充视觉风格和页面框架，让网站从"空白"变成"有骨架有调性"。

设计系统来源于 `design/世界观.md → 视觉调性` 和 `design/界面设计/设计系统.md`。全局布局来源于 `design/界面设计/全局布局.md`。

## Goals / Non-Goals

**Goals:**

- 浏览器访问所有路由均有页面（带视觉风格的占位）
- 导航栏正确显示，当前页高亮，移动端汉堡菜单正常
- 暗色模式切换正常
- CSS 变量（朱砂红、墨色、鎏金等）在页面上可见
- SSE hook 可连接

**Non-Goals:**

- 不实现任何页面的实际内容（属于后续模块）
- 不实现首页横向卷轴动画（属于打磨阶段）
- 不实现登录功能（属于 s06-物帖提交）

## Decisions

### D1: 顶部导航 5 项，关于放页脚

按 `界面设计/全局布局.md` 的导航项定义：顶部导航只放造物志/局中人/物帖墙/造物坊/内坊 5 项。首页通过 Logo 链接，关于页放在页脚链接中。

### D2: 字体方案

- 标题/品牌（font-display）：Noto Serif SC（next/font/google 加载）
- 正文（font-body）：Noto Sans SC
- 等宽（font-mono）：JetBrains Mono

### D3: 暗色模式 — next-themes

使用 next-themes 管理主题切换。默认暗色（墨色背景），支持切换到浅色（宣纸色背景）。CSS 变量在 :root 和 .dark 中分别定义。

### D4: 更鼓指示器

导航栏右侧显示更鼓倒计时（圆点 + 时间）。本阶段只实现静态 UI，实际倒计时逻辑在编排层接入后填充。

## Risks / Trade-offs

- **UnoCSS + shadcn/ui 样式冲突**：shadcn/ui 的 CSS 变量命名（--background、--foreground 等）需要与开物局的语义色（--ink、--paper 等）对齐。→ 在 globals.css 中做映射。
- **中文字体加载性能**：Noto Serif SC / Noto Sans SC 字体文件较大。→ 使用 next/font 的 subset 功能，只加载常用字符集。
