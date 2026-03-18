## Why

从"能用"到"想一直看"。视觉增强、功能补全、体验优化，让展示网站真正有吸引力。

需求来源：`design/施工/13-打磨/README.md`

依赖的前置模块：所有前置模块完成

## What Changes

P0 视觉增强：首页横向卷轴动画、过堂回放动画、角色立绘、盖印动画
P1 功能补全：游商自由活动、内坊页面、关于页面、封存阁、名人堂
P2 体验优化：社交分享、通知系统、性能优化、移动端体验

## Capabilities

### New Capabilities

- `visual-enhance`: 首页动画 + 过堂动画 + 角色立绘 + 盖印动画
- `behind-page`: 内坊页面（物帖旅程动画 + 角色设计理念 + 技术架构 + 统计）
- `about-page`: 关于页面
- `scout-free-activity`: 游商自由活动（Cron #2 实际运行）
- `social-share`: 造物志社交分享（截图卡片 + OG 标签）
- `perf-optimize`: 性能优化（SSE 连接管理 + ISR + 数据库查询优化）

### Modified Capabilities

（无）

## Impact

- 修改首页组件（动画增强）
- 新增内坊页面 + 关于页面
- 修改游商巡视 Cron 逻辑
- 修改各页面（OG 标签 + 性能优化）
