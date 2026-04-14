# Demo Dashboard Design: 深空全息仪表盘

## Overview

一个单文件 HTML 演示页面，可直接在浏览器中打开，呈现高级炫酷的深空全息数据仪表盘风格。

## Visual Style

- **背景**：极深蓝黑径向渐变，中心 `#0a1220` 向四周沉入 `#02040a`
- **主色**：电青 `#00f0ff`（数据、边框、高亮）
- **辅色**：冷白 `#e0f2fe`（文字）、暗青 `#0e3a4a`（面板底色）
- **点缀**：少量 `#ff2a6d` 作为异常/峰值警示色
- **纹理**：
  - 淡扫描线（`repeating-linear-gradient`）
  - 中心向外扩散的极细同心圆（伪元素）

## Layout Structure

页面采用 HUD 分区布局：

### 1. 顶部 Header（全宽，64px）
- 左侧：标题 "OPERATIONS DECK" + 副标题 "SYSTEM MONITOR"
- 右侧：实时 UTC 时间 + 闪烁 "LIVE" 徽标

### 2. 左侧 Sidebar（240px）
- 3 个垂直堆叠指标卡片：CPU Load / Memory / Network
- 每个卡片顶部有一条细长水平进度条，带脉冲光效

### 3. 中央主视觉（剩余宽度）
- 大型雷达图（Canvas 2D）：360° 旋转扫描线 + 随机点云
- 下方 4 个迷你 KPI 方块：Active Nodes / Latency / Throughput / Errors

### 4. 右侧 Sidebar（240px）
- 垂直条形图：最近 60 秒模拟流量
- 底部环形进度图（SVG）：System Integrity

### 5. 底部 Log 条（全宽，48px）
- 等宽字体滚动显示系统日志，逐行追加

## Animations & Interactions

| 效果 | 实现方式 | 说明 |
|------|----------|------|
| 扫描线 | CSS 动画，`pointer-events: none` | 4 秒周期从上往下扫一次 |
| 数字滚动 | JS 插值 + `requestAnimationFrame` | KPI 数字更新时快速过渡 |
| 边框发光 | CSS `::after` + `transform` | hover 时青光从左向右扫过 |
| 雷达扫描 | Canvas 2D + `requestAnimationFrame` | 2 秒/圈旋转扫描线 |
| 日志流 | `setInterval` + DOM 操作 | 每 800ms 追加一条，超 5 条时淡出最旧 |
| 条形图 | CSS `transition: height` | 每 1 秒更新一次高度 |
| 环形图 | SVG `stroke-dashoffset` | 平滑过渡到目标值 |

## Tech Stack

- 单 HTML 文件（`demo.html`），零外部依赖
- Tailwind CSS v4 CDN 负责基础布局
- 内嵌 `<style>` 处理精细光效和自定义动画
- Canvas 2D API 绘制雷达图
- 纯 JS 驱动所有动态效果

## Output

文件落地位置：`/Users/macos/WebProject/kaiwu/demo.html`

## Acceptance Criteria

- [ ] 浏览器直接打开 `demo.html` 即可完整渲染
- [ ] 所有动画和实时效果正常运行
- [ ] 无外部资源请求失败（全部内联）
- [ ] 在桌面端主流浏览器（Chrome/Safari/Firefox）显示一致
