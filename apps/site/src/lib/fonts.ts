import { JetBrains_Mono } from "next/font/google"

/**
 * 等宽字体 — 用于 Agent 对话、代码块、数据数字
 *
 * 只有 JetBrains Mono 走 next/font（体积小，subset 无压力）。
 * 中文字体（Noto Serif SC / Noto Sans SC）通过 Google Fonts CDN 加载，
 * 避免 next/font 编译期下载超大中文字体导致 OOM。
 */
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
})

/** Google Fonts CDN URL — 在 layout.tsx 中通过 <link> 加载 */
export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
