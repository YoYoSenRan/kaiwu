import { useEffect } from "react"

import { useSettingsStore } from "@/stores/settings"

/** 判断事件 target 是否是可编辑元素，避免快捷键干扰输入 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.closest("input, textarea, select, [contenteditable='true']")) return true
  return false
}

/**
 * 订阅 Cmd+B / Ctrl+B 全局快捷键切换 Sidebar 折叠状态。
 * 贴齐 VS Code / Cursor 的肌肉记忆。在 App 顶层调用一次即可。
 */
export function useSidebarShortcut(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.repeat) return
      // 只认 Cmd/Ctrl，不接受 alt/shift，避免和其他快捷键冲突
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.altKey || event.shiftKey) return
      if (event.key.toLowerCase() !== "b") return
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      useSettingsStore.getState().toggleSidebar()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])
}
