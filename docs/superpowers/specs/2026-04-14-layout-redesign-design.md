# 渲染进程布局刷新设计文档

## 背景与问题

当前渲染进程 UI 存在以下视觉与布局问题：

1. **Footer 与 Sidebar 信息重复**：gateway 连接状态在左侧边栏底部和底部 Footer 各出现一次，且 Footer 固定占用 40px 高度，让页面底部显得沉重。
2. **Header 面包屑与页面标题重复**：Header 中的面包屑已显示当前页面名（如「仪表台」），但各页面内部又放置了 `text-2xl` 的大标题，造成信息冗余。
3. **Dashboard 空态太空洞**：首页只有两个占位统计卡片（显示「—」）和一个「暂无数据」的活动区，缺乏视觉焦点和实际信息量。
4. **页面切换动效太平淡**：当前仅 0.15s 的透明度渐变，没有位移或缩放，路由切换感觉生硬。
5. **各页面结构单调一致**：几乎所有页面都是「大标题 + 描述 + 卡片」的相同结构，缺少针对不同页面的布局变化。

## 设计目标

- 消除信息冗余，让每一寸屏幕空间产生价值。
- 让 Dashboard 首页成为真正的「操作台」，而非空态占位。
- 提升路由切换的原生应用感。
- 在不大改技术栈、不引入新依赖的前提下，通过布局重构改善视觉层次。

## 方案概览

采用 **Operations Deck 刷新** 方案：删除 Footer、升级 Header、重设计 Dashboard 和 Connect 页、统一 Knowledge 页头部、升级页面切换动效。

## 具体设计

### 1. 删除 Footer

**现状**：`app/components/layout/footer.tsx` 显示版本号、环境标识、gateway 状态胶囊、ping 延迟、重连倒计时和主题切换提示。

**修改**：
- 删除 `Footer` 组件及其在 `App.tsx` 中的引用。
- 版本号与环境标识迁移到 **Settings → About** 卡片中显示（已有 `about.tsx`，只需补充版本信息）。
- gateway 状态完全由 **SidebarFooter** 承载（已存在，无需额外修改）。
- 主题切换提示（「按 D 切换主题」）去掉——快捷键是隐性能力，不需要常驻提示。

**效果**：主内容区高度增加 40px，页面底部更干净。

### 2. Header 升级：面包屑即标题

**现状**：`app/components/layout/header.tsx` 的面包屑只显示小字当前页名（如「仪表台」），然后页面内部再重复一次大标题。

**修改**：
- Header 中的面包屑区域升级为「导航小字 + 当前页面描述」的组合：
  - 第一行小字：完整面包屑路径（如 `Kaiwu / 仪表台`）
  - 第二行大字：当前页面的描述性标题（如 `运行状态与核心指标一览`）
- 页面组件（Dashboard、Task、KnowledgeList、Connect 等）内部**删除**顶部的 `text-2xl` 标题和 `text-muted-foreground` 描述段落。
- Header 右侧保留主题切换和语言切换按钮。

**效果**：消除标题重复，Header 成为真正的页面标题区。

### 3. Dashboard 重设计：操作台

**现状**：`app/pages/dashboard/index.tsx` 是空态占位——两个统计卡片显示「—」，活动区显示「暂无数据」。

**修改**：将 Dashboard 改为 Bento 风格的操作台布局：

```
┌────────────────────────────┬───────────────┐
│  [+]新建知识库  [⚡]连接   │  Gateway      │
│  [📋]查看任务              │  ● 已连接     │
├────────────────────────────┤  127.0.0.1    │
│  最近知识库                ├───────────────┤
│  ┌────────────┐            │  系统状态     │
│  │ 产品文档   │ 12 docs    │  任务队列  0  │
│  │ 技术规范   │ 8 docs     │  知识库    2  │
│  └────────────┘            │  文档总数  20 │
└────────────────────────────┴───────────────┘
```

- **左侧主区（2fr）**：
  - 顶部：3 个快捷入口按钮（新建知识库、连接管理、查看任务）。
  - 底部：「最近知识库」列表，展示最多 3 个最近访问的知识库（名称 + doc 数），点击可跳转详情。
- **右侧状态区（1fr）**：
  - 顶部：gateway 连接状态卡片（状态点 + 文字 + 地址 + 延迟）。
  - 底部：系统概览卡片（任务队列数、知识库总数、文档总数）。

**数据获取**：
- gateway 状态从 `useGatewayStore` 读取。
- 知识库列表通过 `window.electron.knowledge.base.list()` 获取，取前 3 项。
- 系统概览数字同样来自知识库列表 + 任务状态（任务队列暂时写死 0，留接口后续接入）。

### 4. Connect 页重设计

**现状**：`app/pages/connect/index.tsx` 是 StatusCard + ManualConnectCard + PluginCard 的垂直堆叠。

**修改**：改为「顶部状态横幅 + 下方双列」的布局：

- **顶部状态横幅**：
  - 左侧：状态指示点 + 连接文字（如「已连接到 OpenClaw Gateway」）。
  - 下方小字：地址 + 延迟（monospace）。
  - 右侧：断开/扫描按钮。
  - 根据状态变色：已连接为绿色横幅，断开/错误为灰色/红色横幅。
- **下方双列（grid-cols-2）**：
  - 左列：手动连接表单（地址输入 + Token/Password Tabs + 凭证输入 + 连接按钮）。
  - 右列：本地插件诊断卡片（插件状态、主机版本、网关端口、同步/卸载/重启按钮）。

**效果**：状态信息更醒目，空间利用率更高。

### 5. Knowledge 页统一头部

**列表页**：
- 删除顶部大标题，改为「知识库数量 + 新建按钮」的精简头部。
- 保留现有卡片网格布局。

**详情页**：
- 删除顶部独立的 `text-2xl` 标题区（名称、描述、统计信息）。
- 将知识库名称和描述融入 Tabs 区域上方的一行紧凑头部，统计信息右对齐或作为 Tab 内容的一部分。
- Tabs 本身保持不变（文档 / 检索测试 / 图谱 / 设置）。

### 6. 动效升级

**现状**：`App.tsx` 中 `motion.div` 只有 `opacity: 0 → 1`。

**修改**：加入轻量的 Y 轴位移：

```tsx
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
transition={{ duration: 0.2, ease: "easeOut" }}
```

**效果**：页面切换时有轻微的上下滑入感，更像原生桌面应用。

## 文件改动范围

| 文件 | 改动类型 |
|------|----------|
| `app/App.tsx` | 删除 Footer 引用，升级 motion 配置 |
| `app/components/layout/header.tsx` | 面包屑升级为大标题样式 |
| `app/components/layout/footer.tsx` | **删除** |
| `app/pages/dashboard/index.tsx` | 重设计为操作台 |
| `app/pages/connect/index.tsx` | 重设计为状态横幅 + 双列 |
| `app/pages/knowledge/list/index.tsx` | 删除大标题，精简头部 |
| `app/pages/knowledge/detail/index.tsx` | 精简标题区 |
| `app/pages/task/index.tsx` | 删除大标题 |
| `app/pages/settings/components/about.tsx` | 补充版本号信息 |
| `app/i18n/locales/zh-CN.json` / `en.json` | 补充新的翻译键 |
| `app/styles/app.css` | 移除 Footer 相关样式（如有） |

## 翻译键变更

新增：
- `dashboard.quickActions.title`
- `dashboard.quickActions.newKnowledge`
- `dashboard.quickActions.connect`
- `dashboard.quickActions.viewTasks`
- `dashboard.recentKnowledge`
- `dashboard.systemStatus.title`
- `dashboard.systemStatus.tasks`
- `dashboard.systemStatus.knowledgeBases`
- `dashboard.systemStatus.documents`
- `connect.banner.connected`
- `connect.banner.disconnected`
- `connect.banner.error`

调整：部分页面原有的 `xxx.title` / `xxx.description` 可能不再需要作为独立大标题，但仍保留在 locale 中供 Header 面包屑引用（或后续清理）。

## 技术约束

- 不引入新依赖。
- 不改动主进程逻辑。
- 继续使用 Tailwind + shadcn/ui 组件。
- 继续遵循 `.claude/rules/` 中的规模限制（函数 ≤ 40 行，文件 ≤ 200 行），Dashboard 操作台若超过 200 行需拆出子组件到 `pages/dashboard/components/`。

## 验收标准

- [ ] Footer 已完全移除，窗口底部无固定状态条。
- [ ] Header 面包屑区域显示当前页面描述性标题，页面内无重复大标题。
- [ ] Dashboard 显示快捷入口、最近知识库、gateway 状态、系统概览四项内容。
- [ ] Connect 页顶部有醒目的状态横幅，下方为左右双列布局。
- [ ] Knowledge 列表页和详情页头部精简，无重复标题。
- [ ] 路由切换时有 Y 轴滑入动效。
- [ ] `pnpm lint` 通过，无类型错误。
