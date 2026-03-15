# 导航结构

## Sidebar 导航分组

```
Logo / 项目名

── 概览
   首页 Dashboard

── 生产
   看板（Kanban）
   选题池
   发布管理

── 系统
   Agent 管理
   模板管理

── 监控
   成本追踪
   事件日志

── 设置
   系统设置
```

导航项配置数据驱动，存放在 `constants.ts` 中，每项包含：

- `label`: 显示名
- `href`: 路由路径
- `icon`: lucide-react 图标名
- `group`: 分组名

## Header 组件

从左到右：

1. **移动端**：汉堡菜单按钮（触发 Sidebar Sheet）
2. **面包屑**：基于 pathname 生成
3. **弹性空间**
4. **Gateway 状态指示灯**：绿色 = 已连接，红色 = 断开，黄色 = 重连中
5. **主题切换**：Sun/Moon 图标
6. **用户头像/菜单**

## 移动端 Bottom Nav

固定在底部，4 个核心入口：

- 首页（LayoutDashboard 图标）
- 看板（Kanban 图标）
- Agent（Bot 图标）
- 更多（Menu 图标，展开其余导航）

## 组件文件

```
components/layout/
├── Sidebar.tsx           # 桌面端侧边栏
├── SidebarNav.tsx        # 导航列表（复用于 Sidebar 和 MobileNav）
├── Header.tsx            # 顶部栏
├── MobileNav.tsx         # 移动端抽屉导航
├── BottomNav.tsx         # 移动端底部 Tab
├── GatewayIndicator.tsx  # Gateway 连接状态灯
├── ThemeToggle.tsx       # 主题切换按钮
└── Breadcrumb.tsx        # 面包屑
```
