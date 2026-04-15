import { nativeTheme } from "electron"
import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import type { ThemeEvents, ThemeSource } from "./types"

/**
 * 系统主题模块：获取/设置明暗主题，监听 OS 主题切换并推送到 renderer。
 * renderer 可以用 CSS prefers-color-scheme 媒体查询，但无法主动设置 nativeTheme。
 */
@Controller("theme")
export class ThemeService extends IpcController<ThemeEvents> implements IpcLifecycle {
  onReady(): void {
    nativeTheme.on("updated", () => {
      this.emit("change", nativeTheme.shouldUseDarkColors)
    })
  }

  @Handle("is-dark")
  isDark() {
    return nativeTheme.shouldUseDarkColors
  }

  @Handle("set-source")
  setSource(source: ThemeSource) {
    nativeTheme.themeSource = source
  }
}
