# 样式规范

Tailwind v4 + shadcn/ui + CSS 变量 token 的协作边界。追求主题可换、组件不被污染、样式来源单一。

## 文件分层

```
app/styles/
├── index.css      # 入口：只做 @import 拼装，main.tsx 只 import 这一个
├── tokens.css     # CSS 变量 + @theme inline 映射；所有设计 token 的唯一出处
├── base.css       # 元素级 reset、滚动条、全局 body 样式
├── app.css        # 项目自定义 class（titlebar-*, app-*）
├── shadcn.css     # shadcn 组件外部布局 hook（.tabs-fill / .tabs-list-grid-2 等）
└── markdown.css   # markdown 渲染容器
```

**铁律**：

- 页面目录（`app/pages/**`）禁写全局 CSS
- 新增变量只进 `tokens.css`
- `base.css` 只管元素选择器（`*` / `body` / `::-webkit-scrollbar` 等），不写 class
- `app.css` 只写项目自定义 class（titlebar / app-shell 等），禁止重复 tailwind 已有的 utility
- `shadcn.css` 只写 wrapper class + `[data-slot=...]` 选择器驱动 shadcn 内部布局，不直接改 shadcn 组件

## Token 单一来源

所有颜色、字体、圆角、阴影、字距都从 `tokens.css` 的 CSS 变量出发。

**禁**：

- `bg-[#ff0000]` / `text-[oklch(...)]` 硬编码
- `style={{ color: "#333" }}` 内联颜色
- 在组件/页面里写 `--my-color: ...` 重复定义 token
- `dark:bg-*` 这种用 utility 分支替代 token 主题切换（除非明示白名单，如图形画布浮层）

**对**：

- `bg-primary` / `text-muted-foreground` / `ring-foreground/10` 引用 token
- 主题切换只通过 `.dark` class + `tokens.css` 的 `.dark { ... }` 重定义变量
- 临时色值先进 `tokens.css` 再用

## shadcn 组件零 className

shadcn 组件（`@/components/ui/*`）禁传任何 className。所有布局、尺寸、间距、定位、视觉需求一律通过 wrapper div 承载。

**违例**：

```tsx
// ❌ 传任何 className
<Card className="flex flex-1 flex-col" />
<Button className="w-full" />
<CardContent className="space-y-4" />
<TabsList className="grid grid-cols-2" />
<Progress className="h-2 w-24" />
<Label className="text-sm" />
```

**合规**：

```tsx
// ✅ wrapper 承载布局/尺寸/间距
<div className="flex flex-1 flex-col">
  <Card />
</div>

<div className="w-full">
  <Button />
</div>

<Card>
  <CardContent>
    <div className="space-y-4">{children}</div>
  </CardContent>
</Card>

<div className="w-24">
  <Progress value={...} />
</div>
```

**为什么**：shadcn 组件的视觉由 `tokens.css` 统一控制，加 className 打破主题一致性，也让组件重置（`shadcn add -o`）不可回溯。

## shadcn 不当 shell

`Card`/`Dialog`/`Sheet`/`Popover` 等只当"内容载体"，不当"页面框架"。

**违例**：用 `<Card>` 当三栏布局的一列，塞 `flex-1 h-full`。

**合规**：页面 shell 用 plain div + token（`bg-card`、`ring-foreground/10`、`rounded-xl`）自己构造外观。

判断标准：组件带不带内容语义。Card 是"一张卡片"；聊天面板不是卡片，是面板。

## 组件重置流程

改 shadcn 组件风格只有两条路：

1. **改 `tokens.css` 的变量值**（推荐，影响全局一致）
2. **升级 shadcn 注册表**：`pnpm dlx shadcn@latest add -o <name>` 覆盖

禁止：

- 手改 `app/components/ui/*.tsx` 的 Tailwind class（下次 `add -o` 会冲掉；对主题切换透明度为零）
- Fork shadcn 组件并命名 `MyButton` 覆盖原 `Button`（污染 import 链）

需要扩能力时用 variants prop 或组合，不 fork 源码。

## plain div 允许自由样式但首选 token

非 shadcn 元素（`<div>`/`<span>`/`<button>` 原生）可以自由 className，但：

- 颜色必须走 token（`bg-card` 而非 `bg-white`）
- 阴影走 `shadow-sm`/`shadow-md`（背后仍是 token）
- 圆角走 `rounded-md`/`rounded-xl`（含义语义）
- 间距 `space-y-*`/`gap-*` 不限
- 尺寸 `w-*`/`h-*` 不限

## 自定义 class 命名

只进 `app.css`，kebab-case，语义前缀：

```css
.titlebar        /* ✅ */
.titlebar-btn    /* ✅ */
.app-shell       /* ✅ */

.container       /* ❌ 太泛 */
.wrapper         /* ❌ 无语义 */
.flex-center     /* ❌ 重复 tailwind */
```

## 反模式速查

| 反模式 | 原因 |
|---|---|
| `<Card className="p-4 shadow-none">` | shadcn 传 className |
| `style={{ color: "var(--primary)" }}` | 用 token 但绕 tailwind |
| `bg-[#ff0000]` | 硬编码颜色 |
| 页面目录下 `xxx.css` 全局样式 | 破坏分层 |
| 改 `components/ui/button.tsx` 里的 Tailwind class | shadcn 重置不可回溯 |
| `dark:bg-slate-900` 替代 token 切换 | 破坏主题单一来源 |
| `Card` 当三栏布局列 | shadcn 不当 shell |
| `.custom-btn { padding: 8px }` 在 page 目录 | 自定义 class 只进 app.css |
