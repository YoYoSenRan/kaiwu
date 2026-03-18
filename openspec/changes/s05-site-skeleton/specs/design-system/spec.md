## ADDED Requirements

### Requirement: CSS 变量定义

`apps/site/src/styles/globals.css` SHALL 定义以下 CSS 变量（来源：世界观.md → 色彩）：
- `--ink`: #0a0a0f（墨色 — 主背景）
- `--paper`: #faf8f5（宣纸色 — 浅色背景）
- `--cinnabar`: #c23b22（朱砂红 — 强调色）
- `--gold`: #c9a96e（鎏金 — 辅助强调）
- `--celadon`: #5b9a8b（青瓷绿 — 成功/已开物）
- `--kiln`: #d4833c（窑火橙 — 进行中）
- `--ash`: #6b6b6b（枯墨灰 — 封存）
- `--bone`: #e8e4de（浅灰白 — 正文）

同时 SHALL 映射到 shadcn/ui 的语义变量（--background、--foreground、--primary 等）。

#### Scenario: 暗色模式变量
- **WHEN** 页面处于暗色模式
- **THEN** --background 映射到 --ink，--foreground 映射到 --bone

#### Scenario: 浅色模式变量
- **WHEN** 页面处于浅色模式
- **THEN** --background 映射到 --paper，--foreground 映射到 --ink

### Requirement: UnoCSS 主题配置

`apps/site/uno.config.ts` SHALL 将 CSS 变量注册为 UnoCSS 主题色，支持 `text-cinnabar`、`bg-ink` 等类名。

#### Scenario: 主题色类名可用
- **WHEN** 组件使用 `className="text-cinnabar bg-ink"`
- **THEN** 对应的 CSS 样式正确渲染

### Requirement: 字体加载

`apps/site/src/lib/fonts.ts` SHALL 通过 next/font 加载三套字体：
- Noto Serif SC（font-display，标题/品牌）
- Noto Sans SC（font-body，正文）
- JetBrains Mono（font-mono，等宽）

#### Scenario: 字体在页面上生效
- **WHEN** 页面渲染
- **THEN** 标题使用 Noto Serif SC，正文使用 Noto Sans SC

### Requirement: 暗色模式切换

SHALL 使用 next-themes 管理主题，默认暗色模式，支持手动切换。

#### Scenario: 切换主题
- **WHEN** 用户点击主题切换按钮
- **THEN** 页面在暗色和浅色之间切换，CSS 变量随之变化
