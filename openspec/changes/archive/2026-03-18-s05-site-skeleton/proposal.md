## Why

展示网站是开物局面向用户的唯一入口。需要先搭好骨架——全局布局、完整设计系统（色彩/字体/东方视觉组件/动效）、路由结构——后续的页面内容才有地方放、有风格可循。

开物局的视觉定位是"东方现代"——骨子里是东方的，皮肤是现代的。这不是靠颜色名字叫"朱砂"就能实现的，需要在骨架阶段就把印章、水墨晕染、宣纸纹理、东方排版等视觉基建做好，让后续页面像"拼积木"一样组合。

需求来源：`design/界面设计/设计系统.md`、`design/界面设计/全局布局.md`、`design/世界观.md`

依赖的前置模块：`s01-database-schema`（查询 agents 表展示状态）

## What Changes

- 实现完整设计系统（CSS 变量全集、UnoCSS 主题、字体、动效 keyframes、东方视觉元素）
- 实现全局布局（layout.tsx + Navbar + Footer + MobileNav + PageHeader + LiveActivityBar）
- 创建所有页面的空路由占位（带 metadata、PageHeader、东方风格空状态）
- 创建东方基础 UI 组件（PaperCard、StampBadge、InkWash、PaperTexture、SealIcon）
- 安装 Radix UI primitives 作为无障碍基础

## Capabilities

### New Capabilities

- `design-system-tokens`: 完整 CSS 变量体系（基础色板 + 品牌色变体 + 语义色 + 角色专属色 + 渐变 + 阴影 + 圆角 + 边框）+ UnoCSS 主题 + 字体加载
- `design-system-motion`: 动效体系（7 个 keyframe 动画 + 过渡规范 + prefers-reduced-motion 降级）
- `eastern-components`: 东方视觉基础组件（PaperCard、StampBadge、InkWash 背景、纸纹 noise、SealIcon、更鼓脉冲）
- `global-layout`: 根布局 + 顶部导航（Logo 宋体 + 5 导航项 + 更鼓脉冲指示器 + 登录区 slot）+ 页脚（四栏 + 品牌）+ 移动端 Drawer + PageHeader + 面包屑
- `page-routes`: 10 个页面路由占位（含 metadata、PageHeader 东方排版标题、空状态文案）
- `live-activity-bar`: 底部实时活动条 UI 骨架（SSE 数据接入留到后续模块）

### Modified Capabilities

（无）

## Impact

- 修改 `apps/site/src/styles/globals.css`（完整 CSS 变量 + keyframe 动画）
- 修改 `apps/site/uno.config.ts`（完整主题色 + 字体 + 间距）
- 修改 `apps/site/src/app/layout.tsx`（根布局）
- 新增 `apps/site/src/lib/fonts.ts`（字体加载）
- 新增 `apps/site/src/components/layout/`（Navbar、Footer、MobileNav、PageHeader、Breadcrumb、LiveActivityBar）
- 新增 `apps/site/src/components/ui/`（PaperCard、StampBadge、InkWash、SealIcon 等东方组件）
- 新增约 10 个 page.tsx 占位文件（含 metadata + 空状态）
- 安装 Radix UI primitives（dialog、tooltip、dropdown-menu、separator、avatar）
- 安装 lucide-react
