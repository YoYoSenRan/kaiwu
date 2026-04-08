import { create } from "zustand"
import { persist } from "zustand/middleware"

type Lang = "zh-CN" | "en"
type Theme = "light" | "dark" | "system"
type ResolvedTheme = "dark" | "light"

interface SettingsState {
  lang: Lang
  theme: Theme
  setLang: (lang: Lang) => void
  setTheme: (theme: Theme) => void
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

/** 获取系统当前的实际主题（light / dark） */
export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light"
}

/**
 * 临时禁用所有 CSS transition，避免切换主题时的过渡闪烁。
 * 返回恢复函数，下一帧后自动重新启用 transition。
 */
function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(document.createTextNode("*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"))
  document.head.appendChild(style)

  return () => {
    // 强制 reflow 后用双 rAF 等待当前帧应用完成再移除 style
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

/**
 * 根据 theme 值将对应的 class（light/dark）应用到 documentElement。
 * 切换期间临时禁用 transition，避免过渡闪烁。
 */
export function applyThemeClass(theme: Theme): void {
  const resolved: ResolvedTheme = theme === "system" ? getSystemTheme() : theme
  const restore = disableTransitionsTemporarily()

  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)

  restore()
}

/**
 * 用户设置 store，含主题与语言偏好。
 * 通过 zustand persist 中间件自动持久化到 localStorage["settings"]。
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lang: "zh-CN",
      theme: "system",
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => {
        // 立即 apply class，保证切换在下一次 render 之前就生效
        applyThemeClass(theme)
        set({ theme })
      },
    }),
    {
      name: "settings",
      version: 1,
    },
  ),
)
