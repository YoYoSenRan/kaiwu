/** 系统主题类型 */
export type ThemeSource = "system" | "light" | "dark"

/** Theme controller 可推送的事件。 */
export interface ThemeEvents {
  change: boolean
}

export interface ThemeBridge {
  /** 获取当前系统是否使用暗色主题 */
  isDark: () => Promise<boolean>
  /** 设置主题来源 */
  setSource: (source: ThemeSource) => Promise<void>
  /** 订阅系统主题变化，返回取消订阅函数 */
  onChange: (listener: (isDark: boolean) => void) => () => void
}
