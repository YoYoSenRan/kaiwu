## ADDED Requirements

### Requirement: 根布局

`apps/site/src/app/layout.tsx` SHALL 包含：
- 字体变量注入（html className）
- meta 标签（title: "开物局"、description、OG tags）
- Navbar
- `<main>` 内容区（max-w-7xl mx-auto px-6 lg:px-8）
- Footer

#### Scenario: 页面结构完整
- **WHEN** 访问任意路由
- **THEN** 页面包含顶部导航栏（sticky）、内容区、页脚

---

### Requirement: 顶部导航栏

`Navbar.tsx` SHALL 按 `界面设计/全局布局.md` 实现：

**左侧 — Logo：**
- 文字"开物局"，font-display（Noto Serif SC），20px，weight 700
- letter-spacing: 0.1em
- color: --foreground，hover: color --cinnabar
- 链接到首页 /

**中间 — 5 个导航项：**
- 造物志 /stories、局中人 /agents、物帖墙 /trends、造物坊 /pipeline、内坊 /behind
- font-body 14px，weight 500，color --muted-fg
- hover: color --foreground
- 当前页：color --foreground + 底部 2px --cinnabar 下划线
- 各项间距 gap-8 (32px)

**右侧：**
- 更鼓指示器：8px 圆点（bg --kiln，drum-pulse 动画）+ mono 12px 倒计时文字（--muted-fg）。hover tooltip："下一声更鼓 · 还有 xx 分 xx 秒"。无活跃项目时灰色不跳动，显示"更鼓歇息中"。本阶段倒计时为静态占位值。
- 登录区 slot：渲染一个空的占位容器，s06 填充登录逻辑

**整体样式：**
- h-16 (64px)
- bg: var(--background) / 80% opacity + backdrop-blur-lg
- border-bottom: 1px solid var(--border) / 50% opacity
- sticky top-0 z-50
- 内容 max-w-7xl mx-auto，flex items-center justify-between

#### Scenario: 当前页高亮
- **WHEN** 用户在 /stories 页面
- **THEN** "造物志"导航项显示 --foreground 色 + 底部朱砂下划线

#### Scenario: Logo 链接
- **WHEN** 用户点击 Logo "开物局"
- **THEN** 跳转到首页 /

#### Scenario: 更鼓脉冲
- **WHEN** 页面渲染
- **THEN** 更鼓圆点持续 drum-pulse 脉冲动画（窑火橙色）

---

### Requirement: 移动端导航

`MobileNav.tsx` SHALL 在 < 768px 时：
- 顶部导航项隐藏，显示汉堡图标 ☰
- 点击从右侧滑入 Drawer（translateX(100%) → 0，300ms ease）
- Drawer 宽 80vw，max-width 320px，bg --card
- 遮罩 bg black/50%，点击遮罩关闭
- Drawer 内容：关闭按钮 + 5 个导航项（全宽行，右侧箭头）+ 更鼓信息 + 主题切换 + 登录区 slot
- 基于 Radix Dialog 实现，保证无障碍（ESC 关闭、焦点锁定）

#### Scenario: 汉堡菜单展开
- **WHEN** 屏幕宽度 < 768px 且用户点击汉堡图标
- **THEN** Drawer 从右侧滑入，显示全部导航项

#### Scenario: Drawer 关闭
- **WHEN** 用户点击遮罩或关闭按钮或 ESC
- **THEN** Drawer 滑出关闭

---

### Requirement: 页脚

`Footer.tsx` SHALL 按 `全局布局.md` 实现：

**上半区（grid 4 列）：**
- 第一列：Logo "开物局" + 口号 "天工开物，每帖必应。"
- 第二列 "造物"：造物志、正在进行、封存阁、造物坊
- 第三列 "局中人"：认识他们、关系图谱
- 第四列 "参与"：投一张物帖、登录、GitHub

**下半区：**
- 左：© 2026 开物局 / 以 OpenClaw 为底座
- 右：GitHub · 文档 链接

**样式：**
- 背景 --muted，padding py-16
- 内容 max-w-7xl mx-auto
- 上方 1px solid --border / 30% opacity 分隔线
- 移动端：上半区 2 列，下半区垂直居中

#### Scenario: 关于链接
- **WHEN** 查看页脚第四列
- **THEN** 包含"关于"指向 /about 的链接

---

### Requirement: PageHeader 组件

`PageHeader.tsx` SHALL 提供统一的页面标题区：

- 标题：font-display，h1 (36px)，weight 700，letter-spacing 0.12em
- 副标题：font-body，body-lg (16px)，color --muted-fg，margin-top 8px
- 间距：padding-top 48px，padding-bottom 40px
- 可选 border-bottom: 1px solid --border

#### Scenario: 造物志页面标题
- **WHEN** 访问 /stories
- **THEN** 显示 "造 物 志"（字间距拉宽）+ "每个想法的一生。成器或封存，都值得一读。"

---

### Requirement: 面包屑

`Breadcrumb.tsx` SHALL 在二级页面（如 /stories/[id]、/agents/[id]）显示：

- 格式："造物志 / 极简记账"
- font body-sm (13px)，color --muted-fg
- 分隔符 " / "
- 当前页：color --foreground，weight 500
- 链接 hover underline
- 位置：PageHeader 上方，margin-bottom 12px

---

### Requirement: LiveActivityBar UI 骨架

`LiveActivityBar.tsx` SHALL 实现底部实时活动条的 UI 结构（不含 SSE 数据接入）：

- fixed bottom-4, 水平居中, max-w-xl
- bg --card, border 1px solid --border, shadow-lg, radius-lg
- padding 12px 20px, font body-sm
- 进入动效：slide-up + fade 400ms
- 离开动效：fade-out 300ms
- 右侧 ✕ 关闭按钮
- 本阶段用静态示例数据展示样式，数据接入留到后续模块
