# 样式规范

## 基本原则

- **只用 Tailwind CSS**，禁止 `style={{ }}` inline style 和独立 `.css` 文件
- **所有 className 合并**必须用 `cn()` from `@/lib/utils`，禁止字符串拼接

```tsx
// ❌ 禁止
;<div style={{ marginTop: 16 }} className={"btn" + (active ? " btn-active" : "")} />

// ✅ 正确
import { cn } from "@/lib/utils"
;<div className={cn("mt-4", "btn", active && "btn-active")} />
```

## 颜色与间距

- 只使用 Tailwind 语义 token（`text-foreground`、`bg-background` 等），不用硬编码颜色值
- 禁止 `text-[#333]` 这类任意值，除非是第三方组件覆盖样式的极端情况

## 响应式

- 移动优先：先写小屏样式，再用 `md:` / `lg:` 扩展

## 暗色模式

- 使用 `next-themes` 管理，CSS 变量通过 Tailwind 自动切换，禁止手动判断 `dark:` 前缀堆砌

## 动画

- 用 `tw-animate-css` 提供的类名，禁止写内联 CSS 动画
