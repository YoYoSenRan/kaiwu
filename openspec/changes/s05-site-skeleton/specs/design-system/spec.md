## ADDED Requirements

### Requirement: 完整 CSS 变量体系

`apps/site/src/styles/globals.css` SHALL 在 `:root` 中定义以下 CSS 变量（纯暗色模式，不做明暗切换）。

#### 基础色板

```
变量名              色值                    来源
--background        #0a0a0f (墨)            墨汁
--foreground        #e8e4de (旧纸白)        旧纸
--muted             #1a1a22 (淡墨)          淡墨
--muted-fg          #9b9590 (淡墨字)        枯墨
--card              #111118                 —
--card-fg           #e8e4de                 —
--border            #2a2a35 (墨线)          —
--ring              #c23b22 (朱砂)          印章
```

#### 品牌色（含 hover/active/ghost 变体）

```
--cinnabar           #c23b22         朱砂 — 主强调、盖印、CTA
--cinnabar-light     #d4543d         hover 态
--cinnabar-dark      #a32e1a         active 态
--cinnabar-ghost     #c23b2215       背景微透

--gold               #c9a96e         鎏金 — 辅助强调、掌秤
--gold-light         #d4b87e         hover
--gold-dark          #b8965a         active
--gold-ghost         #c9a96e15       背景微透
```

#### 语义色

```
--celadon            #5b9a8b         成功、已开物
--celadon-ghost      #5b9a8b15       成功背景

--kiln               #d4833c         进行中、锻造、警告
--kiln-ghost         #d4833c15       进行中背景

--ash                #6b6b6b         封存、禁用
--ash-ghost          #6b6b6b15       封存背景

--crimson            #b83232         错误、严重问题
--crimson-ghost      #b8323215       错误背景
```

#### 角色专属色

```
--agent-scout        #a08560         游商 (驼色)
--agent-advocate     #d4833c         说客 (窑火橙)
--agent-critic       #6b6b6b         诤臣 (枯墨灰)
--agent-arbiter      #c9a96e         掌秤 (鎏金)
--agent-artist       #4a7a6b         画师 (青墨)
--agent-smith        #8b5e3c         匠人 (铁锈)
--agent-tester       #7a8a95         试剑 (寒铁银)
--agent-herald       #c23b22         鸣锣 (朱砂)
```

#### 渐变

```
--gradient-ink       radial-gradient(ellipse at 50% 0%, #1a1a25 0%, #0a0a0f 70%)
--gradient-paper     linear-gradient(145deg, #faf8f5 0%, #f0ece6 100%)
--gradient-cinnabar  linear-gradient(135deg, #c23b22 0%, #d4543d 100%)
--gradient-gold      linear-gradient(135deg, #b8965a 0%, #d4b87e 50%, #c9a96e 100%)
```

#### 阴影

```
--shadow-sm          0 1px 2px rgba(0,0,0,0.05)
--shadow             0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
--shadow-md          0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)
--shadow-lg          0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)
--shadow-ink         0 4px 20px rgba(10,10,15,0.3)   /* 暗色模式墨晕 */
```

#### 圆角

```
--radius-sm          4px
--radius             8px
--radius-md          12px
--radius-lg          16px
--radius-xl          24px
--radius-full        9999px
```

#### Scenario: 变量可用
- **WHEN** 组件使用 `color: var(--cinnabar)` 或 `background: var(--background)`
- **THEN** 对应色值正确渲染（墨色背景、旧纸白文字）

---

### Requirement: UnoCSS 完整主题配置

`apps/site/uno.config.ts` SHALL 将所有 CSS 变量注册为 UnoCSS 主题，支持以下 utility class：

- 基础色：`bg-ink`, `bg-paper`, `text-cinnabar`, `bg-muted`, `text-muted-fg`, `border-border` 等
- 品牌色变体：`bg-cinnabar-ghost`, `text-cinnabar-light`, `bg-gold-ghost` 等
- 语义色：`bg-celadon`, `text-kiln`, `bg-ash-ghost`, `text-crimson` 等
- 角色色：`text-agent-scout`, `border-agent-critic` 等
- 字体：`font-display`, `font-body`, `font-mono`

#### Scenario: 主题色类名可用
- **WHEN** 组件使用 `className="text-cinnabar bg-muted border-border"`
- **THEN** 对应的 CSS 样式正确渲染

---

### Requirement: 字体加载

`apps/site/src/lib/fonts.ts` SHALL 通过 next/font/google 加载三套字体：

- Noto Serif SC（font-display）：weight 400/700，用于品牌标题、造物志章节名、角色名号
- Noto Sans SC（font-body）：weight 400/500/600/700，用于正文、按钮、导航
- JetBrains Mono（font-mono）：weight 400/500，用于 Agent 对话、代码、数据数字

SHALL 使用 `display: 'swap'` 确保首屏不被字体加载阻塞。

#### Scenario: 字体在页面上生效
- **WHEN** 页面渲染
- **THEN** 标题使用 Noto Serif SC（宋体气质），正文使用 Noto Sans SC，代码使用 JetBrains Mono

---

### Requirement: 纯暗色模式

网站只有暗色模式（墨色基调），不做明暗切换。不需要 next-themes、ThemeProvider、`.dark` class。CSS 变量在 `:root` 中直接定义暗色值。`<html>` 无需额外 class 或 attribute。

#### Scenario: 墨色基调
- **WHEN** 首次访问任意页面
- **THEN** 页面始终为墨色背景（#0a0a0f），无主题切换入口

---

### Requirement: 动效 Keyframes

`globals.css` SHALL 定义以下 keyframe 动画（来源：设计系统.md → 动效规范）：

```
名称            描述                        时长      用途
fade-in         opacity 0→1                 300ms     元素出现
slide-up        translateY(8px)→0 + fade    300ms     卡片、列表项进入
scale-in        scale(0.95)→1 + fade        200ms     模态框、下拉菜单
stamp           scale(1.3)→1 + fade         200ms     盖印按钮
ripple          圆形波纹扩散                600ms     鸣锣效果
pulse-glow      box-shadow 脉冲             2000ms    进行中状态
ink-spread      径向渐变从 0%→100%          800ms     墨晕过渡
drum-pulse      圆点+阴影脉冲               2000ms    更鼓指示器
```

SHALL 在 `@media (prefers-reduced-motion: reduce)` 中将所有装饰性动画时长设为 0ms 或关闭。

#### Scenario: 动画可用
- **WHEN** 组件使用 `animation: stamp 200ms ease`
- **THEN** 印章盖下的缩放+淡入效果正确播放

#### Scenario: 减弱动效模式
- **WHEN** 用户系统设置 prefers-reduced-motion: reduce
- **THEN** 装饰性动画不播放

---

### Requirement: 过渡规范

SHALL 定义 CSS utility 或变量支持以下过渡：

```
t-fast     150ms ease          hover 色变
t-base     200ms ease          按钮、badge
t-smooth   300ms ease-out      卡片升起
t-slow     400ms ease-out      展开收起
```
