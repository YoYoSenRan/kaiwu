# 官网 (Site) UI 设计指引

## 核心美学方向 (Aesthetic Direction)

**中华未来主义 (Ancient Futurism) / 古风科幻**

完美契合「开物」(Kaiwu) 以三省六部制为骨架的架构理念。融合传统古代权威感与高度精密的数据科技感，呈现“数字沙盘”与“中央智脑”的宏大威严。

- **核心基调：** 尊贵、精密、神秘、威严
- **应用场景：** 开源落地页、控制台入口、全景数据大屏等场景

---

## 色彩体系 (Color Palette)

完全抛弃传统科幻的赛博蓝 (Cyberpunk Blue)，采用极具视觉冲击力的**深邃黑金 (Dark Gold)**。

- `kaiwu-bg`: **曜石黑 (#0A0A0A)** - 主体背景，带极细暗色网格线。
- `kaiwu-gold`: **琥珀金 / 鎏金 (#D4AF37 变体)** - 主题色、关键标题、状态高亮，传递古韵与权力正统。
- `kaiwu-amber`: **明黄色 / 琥珀高光** - 交互状态（Hover / Active / Loading）。
- `kaiwu-muted`: 低透明度的灰白/古铜色，用于次要文本，拉开信息层级。

```css
/* Tailwind CSS 颜色变量示例 */
@layer base {
  :root {
    --kaiwu-bg: 10 10 10;
    --kaiwu-gold: 212 175 55;
    --kaiwu-amber: 255 191 0;
  }
}
```

---

## 排版体系 (Typography)

中西合璧的冲突美学。

1. **中文标题 / 关键文案 (Headings)**
   - 使用**细体/中等粗细的现代衬线字体**（如 Noto Serif SC 中文宋体或思源宋体）。
   - 带有历史厚重感、笔画末端尖锐，表现书法或古典印刷的神韵。
2. **英文 / 数字 / 正文 / 数据指标 (Body & Data)**
   - 使用**干净利落的无衬线体或等宽字体**（如 Inter、Roboto Mono）。
   - 体现高度精密和理性的科技逻辑。

---

## 组件质感与布局 (Components & Textures)

### 1. 核心视觉元素

- **深色玻璃拟态 (Dark Glassmorphism)：** 卡片/弹窗背景带有深色半透明毛玻璃效果，透出底层网格。
- **1px 精密边框 (Hairline Borders)：** 极细的描边，工业感与秩序感。
- **金属护角 (L-Brackets / Corner Accents)：** 组件边缘不完全闭合，四角或左上/右下采用金色的 L 型护角装饰（经典科幻面板特征）。
- **微光与投影 (Glow & Shadow)：** 金色元素带有极微弱的发光效果，模拟能量流转或呼吸灯态。

### 2. 空间布局

- **中心枢纽制 (Hub-and-Spoke)：** 核心主体（如“开物智脑”）居中，通过发光连线连接附属模块（兵部、户部等）。
- **高密度与留白：** 信息密集区与大面积的曜石黑留白形成对比，增加庄重感。

---

## 推荐的 Tailwind CSS 工具风格

```html
<!-- 带有 L 型护角与发光特效的卡片示例 -->
<div class="relative bg-black/40 backdrop-blur-md border border-white/10 p-6 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
  <!-- 金属护角装饰 (左上 & 右下) -->
  <div class="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#D4AF37]"></div>
  <div class="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#D4AF37]"></div>

  <!-- 衬线大标题 -->
  <h2 class="font-serif text-2xl text-[#D4AF37] tracking-widest drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">天工大统沙盘</h2>

  <!-- 科技感无衬线正文/数据 -->
  <div class="mt-4 font-mono text-xs text-white/60"><span class="text-[#FFBF00]">●</span> SYSTEM_READY: OK</div>
</div>
```

---

## 实现原则 (Implementation Rules)

1. **避免原色：** 绝对禁止使用纯红、纯绿、纯蓝色块作为主要设计元素，所有色彩都应该降低饱和度并向“古铜/金色”色系靠拢。
2. **极致对齐：** 受中国传统建筑影响，所有布局必须遵循极其严格的对齐和平行结构。
3. **动画克制：** 微互动（如线条缓慢流转、图标低频呼吸）最佳，不要出现突兀或夸张的弹性动效。
