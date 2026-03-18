## ADDED Requirements

### Requirement: 根布局

`apps/site/src/app/layout.tsx` SHALL 包含：字体加载、meta 标签（title/description/OG）、ThemeProvider（next-themes）、Navbar、Footer。

#### Scenario: 页面结构完整
- **WHEN** 访问任意路由
- **THEN** 页面包含顶部导航栏、内容区、页脚

### Requirement: 顶部导航栏

`Navbar.tsx` SHALL 按 `界面设计/全局布局.md` 实现：
- 左侧：Logo（"开物局"，宋体，链接到首页）
- 中间：5 个导航项（造物志/局中人/物帖墙/造物坊/内坊）
- 右侧：更鼓指示器（静态 UI）+ 主题切换按钮

导航栏 SHALL 为 sticky top-0，背景半透明 + backdrop-blur。

#### Scenario: 当前页高亮
- **WHEN** 用户在 /stories 页面
- **THEN** "造物志"导航项显示高亮样式（朱砂红下划线）

#### Scenario: Logo 链接
- **WHEN** 用户点击 Logo
- **THEN** 跳转到首页 /

### Requirement: 移动端导航

`MobileNav.tsx` SHALL 在 < 768px 时显示汉堡菜单，点击展开全部导航项。

#### Scenario: 汉堡菜单
- **WHEN** 屏幕宽度 < 768px
- **THEN** 顶部导航项隐藏，显示汉堡图标，点击后展开侧边栏或下拉菜单

### Requirement: 页脚

`Footer.tsx` SHALL 包含：品牌信息、导航链接（含"关于"）、版权声明。

#### Scenario: 关于链接
- **WHEN** 查看页脚
- **THEN** 包含指向 /about 的链接
