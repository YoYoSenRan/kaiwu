---
paths:
  - "app/**/*.tsx"
  - "app/**/*.css"
---

# UI 设计语言：Operations Deck

工程化仪表盘风格。技术、密集、克制、有性格。

灵感参照：Linear、Vercel Dashboard、Raycast、Bloomberg Terminal。

## 核心原则

1. **冷峻精确感** —— 信息密度优先，扫描效率第一
2. **拒绝装饰** —— 没有阴影、没有渐变、没有玻璃拟物、没有圆角（除了状态点）
3. **单色 + 单点睛** —— 灰阶为主，单一暖色（amber）作为唯一强调
4. **极致字号对比** —— 巨大数字 vs 极小标签，避免中等字号扎堆
5. **数据等宽，文字 sans** —— 两套字体严格分离

## 字体系统

| 用途 | 字体 | Tailwind class |
|---|---|---|
| Sans body | Roboto Variable | `font-sans`（默认） |
| Mono data | 系统等宽栈 | `font-mono` |

CSS 变量定义在 `app/styles/tokens.css`：

```css
--font-sans: "Roboto Variable", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

**禁用**：Inter、Arial、自行装其他衬线/sans 字体（除非用户明确要求）

## 颜色系统

### 灰阶（shadcn 主题 token）

| 用途 | Class |
|---|---|
| 主前后景 | `bg-background` / `text-foreground` |
| 次要文字 | `text-muted-foreground` |
| Hairline 边框 | `border-border` |
| Hover 浅底 | `bg-accent` |

### 单一强调色（自定义）

定义在 `app/styles/tokens.css` 的 `--deck-accent`（和 shadcn token 同处），深浅模式各调一档亮度：

```css
:root  { --deck-accent: oklch(0.7 0.16 55); }
.dark  { --deck-accent: oklch(0.78 0.15 60); }
```

**调用 class**：`deck-accent` / `deck-accent-bg` / `deck-accent-border`

**强调色只用于 3 个场景**：

1. 状态指示点（pulse dot、当前活跃服务）
2. 关键数据 / 链接（`02 pending`、`Inspect queue →`）
3. 警告状态（`DEGRADED`、错误率超标）

**禁用**：彩虹仪表盘、多 accent 色、Tailwind blue/purple/green/red 直接堆叠

## 字号层级（必须遵守的对比铁律）

| 用途 | 推荐 class |
|---|---|
| Hero 数字 | `text-[180px] leading-[0.85] font-extralight tracking-[-0.05em] tabular` |
| Section 大数字 | `text-4xl font-light tabular` |
| 正文 | `text-sm` (14px) |
| 元数据 | `text-xs` (12px) |
| 时间戳 / ID | `text-[11px] font-mono tabular` |
| 标签（uppercase + tracking） | `text-[10px] tracking-[0.3em] uppercase text-muted-foreground` |

**铁律**：每个 section 必须有"巨型 + 极小"的组合。禁止整页都是 14-16px 中等字号。

**数字必须 `tabular`**（自定义 class，启用 `font-feature-settings: tnum`），保证多位数字垂直对齐。

## 间距 / 网格 / 边框

### 间距
- 页面边距：`px-10`（40px）
- Section 间距：`mt-16`（64px）
- 卡片内边距：`p-6`（24px）
- 行间距：`py-3`（12px）

### 网格
- 主区使用 12 列：`grid grid-cols-12 gap-12`
- **不对称分配**：常用 7+5 或 8+4，避免 6+6 对称
- 卡片网格用 `gap-px` + 父级背景色（`deck-grid-bg`）做 1px 分隔

### 边框
- **只用 1px hairline**：`border border-border`
- **不用粗边框、双边框、装饰边框**
- 强调侧边：`border-l-2 deck-accent-border pl-6`

## 动画系统

定义在 `app/styles/app.css`：

| Class | 用途 | 配置 |
|---|---|---|
| `deck-rise` | 入场上升 + 渐显 | 0.7s cubic-bezier(0.16, 1, 0.3, 1) |
| `deck-fade` | 入场渐显 | 0.9s ease-out |
| `deck-pulse` | 状态点呼吸 | 2s ease-in-out infinite |

### Stagger 入场延迟

```tsx
{items.map((item, i) => (
  <div className="deck-rise" style={{ animationDelay: `${BASE + i * STEP}ms` }}>
```

参考延迟值（避免动画"泥石流"）：

| 区块 | base | step |
|---|---|---|
| Header | 0ms | — |
| Hero | 0ms / 120ms | — |
| Stat cards | 280ms | 70ms |
| Activity rows | 600ms | 50ms |
| Service rows | 700ms | 60ms |
| Footer | 1200ms | — |

### Hover 微互动（推荐）

- 卡片：`hover:bg-accent/30 transition-colors`
- 链接：`hover:underline underline-offset-4`
- 按钮间距：`hover:gap-3 transition-all`
- 隐藏元素显隐：`opacity-0 group-hover:opacity-100 transition-opacity`

## 组件骨架模板

### 巨型数字 + 标签
```tsx
<div>
  <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">Label</p>
  <p className="text-[180px] leading-[0.85] font-extralight tracking-[-0.05em] tabular">14</p>
</div>
```

### Stat 卡片
```tsx
<div className="bg-background p-6 hover:bg-accent/30 transition-colors">
  <div className="flex items-center justify-between">
    <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Label</span>
    <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
  </div>
  <div className="mt-5 flex items-baseline gap-1.5 tabular">
    <span className="text-4xl font-light">42</span>
    <span className="text-xs text-muted-foreground font-mono">unit</span>
  </div>
</div>
```

### 数据列表行（带状态点 + 进度条）
```tsx
<div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0">
  <span className="size-1.5 rounded-full deck-accent-bg deck-pulse" />
  <span className="text-xs font-mono w-16">name</span>
  <div className="flex-1 h-px bg-border relative overflow-hidden">
    <div className="h-full deck-accent-bg" style={{ width: "42%" }} />
  </div>
  <span className="text-[10px] font-mono text-muted-foreground tabular w-10 text-right">42%</span>
</div>
```

### Hairline section header
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
    <h2 className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Title</h2>
  </div>
  <button className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Action</button>
</div>
```

### 控件按钮（icon-only 或 icon + text）
```tsx
<button className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
  <Icon className="size-3" strokeWidth={1.5} />
  <span className="text-[10px] tracking-[0.15em] font-mono uppercase">Label</span>
</button>
```

## 图标系统

- 库：lucide-react
- 默认尺寸：`size-3.5`（14px）—— 标签内 icon 用此尺寸
- 大尺寸：`size-4` 或 `size-5` —— hero 区
- 描边：`strokeWidth={1.5}` —— 比默认 2 更细，更符合 hairline 风格

## 国际化适配

**翻译**：所有面向用户的文本（标题、标签、描述、按钮、footer）

**不翻译**：标识符 / 代码（service 名、event type、status 代码、版本号、时间戳）—— 中文环境下保持英文反而更专业

实现：`useTranslation()` + `t("deck.xxx")`，翻译键定义在 `app/i18n/locales/{en,zh-CN}.json`。

## 反模式（一律禁用）

| 反模式 | 原因 |
|---|---|
| `shadow-md` `shadow-lg` 等阴影 | 与 hairline 风格冲突 |
| `rounded-lg` `rounded-xl` 等大圆角 | 工程美学拒绝消费品圆角；只允许 `rounded-full` 用于状态点 |
| `bg-gradient-to-*` 渐变 | 装饰即冗余 |
| `backdrop-blur` 玻璃拟物 | 同上 |
| 多色 button（蓝/绿/红） | 单 accent 原则 |
| Emoji 强调、卡通插图 | 不符合工程审美 |
| 居中对齐的 hero | 必须左对齐 + 不对称网格 |
| 中等字号扎堆 | 必须有"极大 vs 极小"的对比 |
| 默认浏览器 outline 颜色 | 用主题 ring |
| 硬编码 hex 颜色 | 必须用 shadcn token 或 deck-* class |

## 必备模式（每个新页面都要有）

- ✅ 至少 1 处"巨型数字 + 极小标签"对比
- ✅ 12 列不对称 grid（7+5 或 8+4）
- ✅ Tabular 数字
- ✅ 标签全大写 + tracking-wider
- ✅ 单 accent 色，仅用于 3 类场景
- ✅ deck-rise stagger 入场
- ✅ Hover 微互动（至少一种）
- ✅ 同时支持深浅主题（用 shadcn token，不硬编码颜色）
- ✅ i18n（用户文本走 `t()`）

## 当前可用的自定义 utility class

定义在 `app/styles/app.css`：

| Class | 作用 |
|---|---|
| `deck-rise` | 入场动画（上升 + 渐显） |
| `deck-fade` | 入场渐显 |
| `deck-pulse` | 呼吸动画 |
| `deck-accent` | 暖色文字 |
| `deck-accent-bg` | 暖色背景 |
| `deck-accent-border` | 暖色边框 |
| `deck-grid-bg` | 网格分隔背景 |
| `tabular` | 数字等宽（`font-feature-settings: tnum`） |

## 当前参考实现

完整应用此设计语言的页面：`app/App.tsx`

新建页面 / 组件时，参考它的：
- Header 结构（左 brand + 右 meta + 控件）
- Hero 巨型数字布局
- Stat 卡片网格
- 数据列表行模式
- Stagger 动画时序
