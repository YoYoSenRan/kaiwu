## ADDED Requirements

### Requirement: PaperCard 宣纸卡片

`apps/site/src/components/ui/PaperCard.tsx` SHALL 实现宣纸风格卡片（来源：设计系统.md → Card → Paper Card）：

- 继承标准卡片样式：bg --card，border 1px solid --border，radius-md (12px)，padding 24px，shadow
- 附加东方元素：
  - background-image: 极淡纸纹 noise（opacity 3%，CSS SVG filter 实现，不用图片）
  - border: double 3px var(--border)（双线边框，暗示卷轴边）
  - `::before` 伪元素：左上角折角效果（纯 CSS 三角形）
- hover: shadow-lg + translateY(-2px)，transition 200ms
- 适用场景：物帖卡片、造物志容器

#### Scenario: 宣纸质感
- **WHEN** 渲染 PaperCard
- **THEN** 可见微妙的纸纹质感和双线边框，左上角有折角

#### Scenario: hover 浮起
- **WHEN** 鼠标悬停在 PaperCard 上
- **THEN** 卡片上浮 2px + 阴影加深

---

### Requirement: StampBadge 印章徽章

`apps/site/src/components/ui/StampBadge.tsx` SHALL 实现印章风格徽章（来源：设计系统.md → 东方元素库 → 印章）：

- 样式：朱砂色方形，border 2px solid currentColor，border-radius 2px，padding 2px 6px
- font-display（Noto Serif SC），12px
- transform: rotate(-2deg)（微偏倾斜）
- 边缘粗糙感：通过 CSS clip-path 或 SVG mask 实现不规则边缘
- 支持 size prop：sm (24x24 行内)、md (40x40 按钮)、lg (64x64 裁决)
- 适用场景：盖印投票按钮、Agent 签名、阶段完成标记、掌秤裁决

#### Scenario: 印章外观
- **WHEN** 渲染 StampBadge
- **THEN** 显示朱砂色方章，微偏倾斜，有手工感

---

### Requirement: InkWash 墨晕背景

`apps/site/src/components/ui/InkWash.tsx` SHALL 实现水墨晕染背景效果（来源：设计系统.md → 东方元素库 → 水墨晕染）：

- Hero 墨晕变体：多层 radial-gradient 叠加模拟水墨散开
  ```
  radial-gradient(ellipse 600px 400px at 30% 20%, rgba(26,26,37,0.6), transparent),
  radial-gradient(ellipse 400px 600px at 70% 80%, rgba(26,26,37,0.4), transparent),
  var(--background)
  ```
- 章节分隔墨晕变体：height 120px，linear-gradient 淡入淡出，opacity 0.3
- 不使用真实图片，纯 CSS 渐变实现
- 每页最多 1-2 处使用

#### Scenario: Hero 墨晕
- **WHEN** 首页 Hero 区使用 InkWash variant="hero"
- **THEN** 背景呈现水墨散开的效果，有东方氛围感

---

### Requirement: SealIcon 印章图标

`apps/site/src/components/ui/SealIcon.tsx` SHALL 实现方形印章图标容器：

- 接收 children（文字或 emoji）
- 外框：border 2px solid --cinnabar，正方形，居中对齐
- transform: rotate(-3deg ~ 3deg)（可配置或随机微偏）
- color --cinnabar
- 适用场景：阶段完成标记、签名

---

### Requirement: 纸纹 CSS Utility

SHALL 在 globals.css 中定义可复用的纸纹背景 CSS class：

```css
.paper-texture {
  background-image: url("data:image/svg+xml,..."); /* SVG noise pattern */
  background-size: 200px 200px;
  opacity: 0.03;
  pointer-events: none;
}
```

或通过 UnoCSS 自定义 utility 实现 `bg-paper-texture`。

---

### Requirement: 东方元素使用克制规则

所有东方组件的 JSDoc SHALL 标注使用场景和克制规则：
- 印章/水墨/纸纹等东方元素，单个页面不超过 3 处点缀
- PaperCard 仅用于物帖和造物志容器，不滥用于所有卡片
- InkWash 每页最多 1-2 处
- 过多则俗，克制是关键
