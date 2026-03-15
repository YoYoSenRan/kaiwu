# 响应式布局

## 整体结构

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ [☰ 移动菜单] [面包屑]              [Gateway ●] [🌙] [用户] │
├────────────┬────────────────────────────────────────────────┤
│            │                                                  │
│  Sidebar   │  Main Content                                   │
│  (桌面)    │                                                  │
│            │  ┌──────────────────────────────────────────┐   │
│  Logo      │  │  Page Header                             │   │
│  ────      │  │  标题 + 描述 + 操作按钮                   │   │
│  导航项    │  ├──────────────────────────────────────────┤   │
│  导航项    │  │                                          │   │
│  ...       │  │  Page Content                            │   │
│            │  │                                          │   │
│  ────      │  └──────────────────────────────────────────┘   │
│  系统状态  │                                                  │
│  Gateway●  │                                                  │
│            │                                                  │
└────────────┴────────────────────────────────────────────────┘
```

## 响应式断点

| 断点              | Sidebar              | Header       | 导航         |
| ----------------- | -------------------- | ------------ | ------------ |
| `< md`（手机）    | 隐藏，Sheet 抽屉呼出 | 显示汉堡菜单 | 底部 Tab Bar |
| `md ~ lg`（平板） | 收起为图标栏 `w-16`  | 正常         | Sidebar 图标 |
| `≥ lg`（桌面）    | 展开 `w-64`          | 正常         | Sidebar 完整 |

## 配色方案

使用 Tailwind 语义 token，不硬编码颜色值：

- 背景：`bg-background` / `bg-card` / `bg-muted`
- 文字：`text-foreground` / `text-muted-foreground`
- 边框：`border-border`
- 主色：`bg-primary` / `text-primary`
- 强调：`bg-accent`
- 危险：`bg-destructive`

Sidebar 使用独立的 sidebar token：

- `bg-sidebar` / `text-sidebar-foreground`
- `bg-sidebar-accent` / `text-sidebar-accent-foreground`
- `bg-sidebar-primary` / `text-sidebar-primary-foreground`
