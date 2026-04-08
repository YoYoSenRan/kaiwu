import { useEffect } from "react"
import { useSettingsStore, applyThemeClass, getSystemTheme } from "@/stores/settings"

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

/** 判断事件 target 是否是可编辑元素，避免快捷键干扰输入 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.closest("input, textarea, select, [contenteditable='true']")) return true
  return false
}

/**
 * 订阅 theme 相关的全局副作用：
 * - 系统主题变化时自动同步（仅 theme="system" 时）
 * - 全局 D 键快捷键在 light / dark 之间切换
 *
 * 在应用根组件（App.tsx）顶层调用一次即可。
 */
export function useThemeEffect(): void {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  // 监听系统主题变化（仅当前选择"跟随系统"时）
  useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia(COLOR_SCHEME_QUERY)
    const handler = () => applyThemeClass("system")
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [theme])

  // 全局 D 键：dark ↔ light，system 时根据系统当前色切到反义
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return
      if (event.key.toLowerCase() !== "d") return

      const current = useSettingsStore.getState().theme
      const next: Parameters<typeof setTheme>[0] =
        current === "dark" ? "light" : current === "light" ? "dark" : getSystemTheme() === "dark" ? "light" : "dark"
      setTheme(next)
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [setTheme])
}
