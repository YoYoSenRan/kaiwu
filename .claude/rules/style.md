# 样式规范

- 只用 UnoCSS 类名，不写内联 style 或 CSS Module
- 合并类名必须用 `cn()`：`cn("text-lg", isActive && "text-cinnabar")`
- 使用语义 token（`text-cinnabar`、`bg-ink`），不用原始色值
- 响应式断点：`sm:` (640px) / `md:` (768px) / `lg:` (1024px) / `xl:` (1280px)
- 间距用 UnoCSS 的 spacing scale（`p-4`、`mt-8`），不用任意值
- 暗色模式通过 CSS 变量自动切换，不用 `dark:` 前缀
