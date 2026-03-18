## Context

apps/site 已在 s00 中初始化（Next.js 16 + UnoCSS + 基础配置）。本阶段填充完整的东方现代视觉风格和页面框架，让网站从"空白 Next.js 模板"变成"一眼就知道是开物局"的有调性骨架。

设计系统来源于 `design/世界观.md → 视觉调性` 和 `design/界面设计/设计系统.md`。全局布局来源于 `design/界面设计/全局布局.md`。

## Goals / Non-Goals

**Goals:**

- 浏览器访问所有路由均有页面（带东方视觉风格的占位，不是白板）
- 导航栏正确显示（宋体 Logo、当前页朱砂高亮、更鼓脉冲动画），移动端 Drawer 正常
- 完整 CSS 变量可用：基础色板 + 品牌色变体（hover/active/ghost）+ 语义色 + 角色专属色
- 东方基础组件可用：PaperCard（宣纸卡片）、StampBadge（印章徽章）、InkWash（墨晕背景）
- 动效 keyframes 注册完毕，支持 prefers-reduced-motion 降级
- 每个占位页面有 PageHeader（东方排版标题 + 副标题）和空状态文案

**Non-Goals:**

- 不实现任何页面的实际业务内容（属于后续模块）
- 不实现首页横向卷轴动画（属于打磨阶段）
- 不实现登录功能（属于 s06），但 Navbar 预留登录区 slot
- 不实现 SSE 数据连接（推迟到需要实时数据的页面模块）
- 不实现角色水墨头像插图（需要设计资源，骨架阶段用 emoji 占位）
- 不实现 LiveActivityBar 的 SSE 数据接入（只做 UI 骨架）

## Decisions

### D1: 不用 shadcn/ui 预制组件，用 Radix primitives + 自建

开物局的东方主题（朱砂印章、水墨晕染、宣纸纹理）需要完全自建视觉组件。通用交互（Dialog、Tooltip、Dropdown）用 Radix UI primitives 做无障碍基础，视觉层全部自建。

原因：shadcn/ui 预制组件的视觉风格是 Western modern，跟东方调性冲突。但 shadcn/ui 的语义 CSS 变量命名（--background、--foreground、--primary 等）是合理的，保留这层映射方便 Radix 组件用。

### D2: 顶部导航 5 项 + 登录区 slot

按 `界面设计/全局布局.md`：顶部导航放造物志/局中人/物帖墙/造物坊/内坊 5 项。首页通过 Logo 链接，关于页放在页脚。右侧：更鼓指示器 + 登录区（本阶段渲染空 slot，s06 填充）。

### D3: 字体方案 — next/font + subset

- 标题/品牌（font-display）：Noto Serif SC（next/font/google，weight 400/700，subsets: ['latin']，preload 中文常用字）
- 正文（font-body）：Noto Sans SC（weight 400/500/600/700）
- 等宽（font-mono）：JetBrains Mono（weight 400/500）

中文字体通过 next/font 的自动 subset 优化，避免全量加载。

### D4: 纯暗色模式 — 墨色即品牌

不做明暗切换。墨色背景（#0a0a0f）就是开物局的视觉身份——水墨、朱砂、鎏金这些东方元素在深色底上才有神韵。加浅色模式只会稀释调性，且双套变量维护成本翻倍。

CSS 变量只写一份，直接在 `:root` 中定义暗色值。不需要 next-themes、ThemeProvider、`.dark` class。

### D5: 东方视觉元素 — 克制使用

遵循世界观的"三条铁律"：
1. 信息优先：装饰不得干扰信息传达
2. 东方克制：水墨/印章/宣纸纹理等元素单页不超过 3 处点缀
3. 动静有度：常态安静，关键事件才有动效

骨架阶段建立组件库但不滥用。每个组件的 JSDoc 标注适用场景。

### D6: 移动端 — 右侧 Drawer 滑入

按设计文档，移动端 < 768px 时导航折叠为汉堡图标，点击从右侧滑入 Drawer（width 80vw，max 320px），包含全部导航项 + 更鼓。用 Radix Dialog 做 Drawer 基础，保证无障碍。

### D7: 色彩变量层级

三层架构：
1. **原始色**（globals.css）：`--ink: #0a0a0f` 等，不直接在组件中使用
2. **语义色**（globals.css）：`--background`、`--foreground`、`--primary` 等，组件使用这层。只有一套值（暗色），不做明暗切换
3. **UnoCSS 主题色**（uno.config.ts）：引用 CSS 变量，提供 `bg-ink`、`text-cinnabar` 等 utility class

## Risks / Trade-offs

- **中文字体加载性能**：Noto Serif SC / Noto Sans SC 字体文件较大。→ 使用 next/font 的自动优化 + font-display: swap，首屏先用系统字体，字体加载完成后替换。
- **东方组件过度设计**：骨架阶段只做"基础积木"（PaperCard、StampBadge、InkWash），不做业务级组件（StoryCard、AgentCard 等），那些留到对应页面模块实现。
- **CSS 变量数量多**：完整色彩体系约 50+ 变量。→ 按类别分组注释，保持 globals.css 可维护。
- **动效降级**：所有装饰性动效在 `prefers-reduced-motion: reduce` 时关闭。→ keyframe 动画统一通过 CSS media query 控制。
