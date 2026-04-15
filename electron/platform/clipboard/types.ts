export interface ClipboardBridge {
  /** 读取剪贴板文本 */
  readText: () => Promise<string>
  /** 写入剪贴板文本 */
  writeText: (text: string) => Promise<void>
  /** 读取剪贴板图片，返回 data URL（无图片时返回空字符串） */
  readImage: () => Promise<string>
  /** 将 data URL 格式的图片写入剪贴板 */
  writeImage: (dataUrl: string) => Promise<void>
}
