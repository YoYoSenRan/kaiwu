export interface ShellBridge {
  /** 用默认浏览器打开 URL */
  openExternal: (url: string) => Promise<void>
  /** 在 Finder/资源管理器中显示文件 */
  showInFolder: (path: string) => Promise<void>
  /** 用系统默认应用打开文件，返回错误信息（空字符串表示成功） */
  openPath: (path: string) => Promise<string>
}
