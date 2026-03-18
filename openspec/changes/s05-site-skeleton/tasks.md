## 1. 设计系统 — CSS 变量

- [x] 1.1 配置 `globals.css` 基础色板：在 `:root` 中定义 --background/--foreground/--muted/--muted-fg/--card/--card-fg/--border/--ring（纯暗色，不做明暗切换） — 验收：墨色背景 + 旧纸白文字渲染正确
- [x] 1.2 配置 `globals.css` 品牌色：--cinnabar/-light/-dark/-ghost、--gold/-light/-dark/-ghost — 验收：`color: var(--cinnabar-light)` 可用
- [x] 1.3 配置 `globals.css` 语义色：--celadon/-ghost、--kiln/-ghost、--ash/-ghost、--crimson/-ghost — 验收：所有语义色变量可用
- [x] 1.4 配置 `globals.css` 角色专属色：--agent-scout/advocate/critic/arbiter/artist/smith/tester/herald — 验收：8 个角色色变量可用
- [x] 1.5 配置 `globals.css` 渐变：--gradient-ink/paper/cinnabar/gold — 验收：`background: var(--gradient-ink)` 渲染正确
- [x] 1.6 配置 `globals.css` 阴影：--shadow-sm/shadow/shadow-md/shadow-lg/shadow-ink — 验收：shadow-ink 有墨晕效果
- [x] 1.7 配置 `globals.css` 圆角：--radius-sm/radius/radius-md/radius-lg/radius-xl/radius-full — 验收：圆角变量可用

## 2. 设计系统 — UnoCSS 主题

- [x] 2.1 配置 `uno.config.ts` 完整主题色：基础色 + 品牌色变体 + 语义色 + 角色色，全部引用 CSS 变量 — 验收：`text-cinnabar`、`bg-muted`、`border-border`、`bg-cinnabar-ghost`、`text-agent-scout` 等类名可用
- [x] 2.2 配置 `uno.config.ts` 字体主题：font-display/font-body/font-mono — 验收：`font-display` 类名渲染宋体

## 3. 设计系统 — 字体

- [x] 3.1 创建 `apps/site/src/lib/fonts.ts`：next/font/google 加载 Noto Serif SC (400/700) + Noto Sans SC (400/500/600/700) + JetBrains Mono (400/500)，display: 'swap' — 验收：页面标题渲染宋体，正文渲染黑体

## 4. 设计系统 — 动效

- [x] 4.1 在 `globals.css` 中定义 8 个 keyframe 动画：fade-in、slide-up、scale-in、stamp、ripple、pulse-glow、ink-spread、drum-pulse — 验收：`animation: stamp 200ms ease` 正确播放
- [x] 4.2 添加 `@media (prefers-reduced-motion: reduce)` 规则，将所有装饰性动画禁用 — 验收：系统减弱动效设置下动画不播放
- [x] 4.3 定义过渡 CSS 自定义属性或 UnoCSS shortcuts：t-fast (150ms)、t-base (200ms)、t-smooth (300ms)、t-slow (400ms) — 验收：组件可使用过渡类名

## 5. 东方基础组件

- [x] 5.1 实现 `PaperCard.tsx`：宣纸卡片（双线边框 + 纸纹 noise + 左上折角 + hover 浮起） — 验收：渲染可见纸纹质感和折角
- [x] 5.2 实现 `StampBadge.tsx`：印章徽章（朱砂方章 + 微偏倾斜 + 不规则边缘 + sm/md/lg 三档） — 验收：渲染朱砂色方章，有手工感
- [x] 5.3 实现 `InkWash.tsx`：墨晕背景（hero 变体多层 radial-gradient + section 变体 linear-gradient） — 验收：Hero 区有水墨散开效果
- [x] 5.4 实现 `SealIcon.tsx`：方形印章图标容器（朱砂边框 + 微偏旋转） — 验收：渲染正方形朱砂印章框
- [x] 5.5 在 globals.css 中定义 `.paper-texture` CSS class（SVG noise pattern，opacity 3%） — 验收：叠加到元素上有微妙纸纹
- [x] 5.6 所有东方组件添加 JSDoc 注释，标注适用场景和克制规则 — 验收：每个组件有 `@description` 和 `@example`

## 6. 全局布局

- [x] 6.1 实现 `layout.tsx`：字体变量注入 + meta（title/description/OG）+ Navbar + Footer — 验收：所有页面有统一布局
- [x] 6.2 实现 `Navbar.tsx`：宋体 Logo("开物局") + 5 导航项 + 更鼓脉冲指示器 + 登录区空 slot。sticky top-0 + bg 80% opacity + backdrop-blur — 验收：当前页朱砂高亮，更鼓圆点脉冲
- [x] 6.3 实现 `MobileNav.tsx`：< 768px 汉堡菜单 → 右侧 Drawer 滑入（Radix Dialog 基础，80vw max-320px），含导航项 + 更鼓 — 验收：移动端 Drawer 展开/收起正常，ESC 可关闭
- [x] 6.4 实现 `Footer.tsx`：上半区 4 栏（品牌/造物/局中人/参与）+ 下半区（版权 + 链接），背景 --muted — 验收：页脚在所有页面显示，移动端 2 栏
- [x] 6.5 实现 `PageHeader.tsx`：font-display 标题（36px，letter-spacing 0.12em）+ 副标题（--muted-fg） — 验收：标题有东方排版拉宽字间距效果
- [x] 6.6 实现 `Breadcrumb.tsx`：二级页面面包屑（body-sm，--muted-fg，当前页加粗） — 验收：/stories/[id] 页面显示 "造物志 / xxx"
- [x] 6.7 实现 `LiveActivityBar.tsx`：fixed 底部活动条 UI 骨架（slide-up 进入 + fade-out 离开 + 关闭按钮），静态示例数据 — 验收：底部活动条可显示/关闭

## 7. 路由占位页面

- [x] 7.1 创建 `/` 首页：InkWash hero 背景 + "开 物 局" hero 标题 + 口号 — 验收：首页有墨晕氛围感
- [x] 7.2 创建 `/stories` 造物志列表占位：PageHeader + 空状态 — 验收：/stories 可访问，显示"还没有造物志"
- [x] 7.3 创建 `/stories/[id]` 造物志详情占位：Breadcrumb + 空状态 — 验收：/stories/xxx 可访问
- [x] 7.4 创建 `/stories/[id]/flow` 对话流占位 — 验收：/stories/xxx/flow 可访问
- [x] 7.5 创建 `/agents` 局中人总览占位：PageHeader + 空状态 — 验收：/agents 可访问
- [x] 7.6 创建 `/agents/[id]` 局中人详情占位：Breadcrumb + 空状态 — 验收：/agents/xxx 可访问
- [x] 7.7 创建 `/trends` 物帖墙占位：PageHeader + 空状态 — 验收：/trends 可访问
- [x] 7.8 创建 `/pipeline` 造物坊占位：PageHeader + 空状态 — 验收：/pipeline 可访问
- [x] 7.9 创建 `/behind` 内坊占位：PageHeader + 空状态 — 验收：/behind 可访问
- [x] 7.10 创建 `/about` 关于页占位：PageHeader + 简要介绍文本 — 验收：/about 可访问
- [x] 7.11 所有页面导出 metadata（title: "xxx | 开物局"，description） — 验收：HTML head 中 title 正确

## 8. 依赖安装

- [x] 8.1 安装 Radix UI primitives：@radix-ui/react-dialog、@radix-ui/react-tooltip、@radix-ui/react-dropdown-menu、@radix-ui/react-separator、@radix-ui/react-avatar — 验收：primitives 可导入
- [x] 8.2 安装 lucide-react — 验收：图标组件可导入

## 9. 验证

- [x] 9.1 `pnpm dev:site` 启动无报错
- [x] 9.2 所有路由浏览器可访问，有东方视觉风格（非白板）
- [x] 9.3 墨色基调一致，无浅色/白色闪屏
- [x] 9.4 移动端导航 Drawer 正常
- [x] 9.5 更鼓指示器脉冲动画播放正常
- [x] 9.6 PaperCard、StampBadge、InkWash 组件渲染正确
- [x] 9.7 `pnpm typecheck` 通过
- [x] 9.8 `pnpm lint` 通过
