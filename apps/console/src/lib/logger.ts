const isDev = process.env.NODE_ENV === "development"

const COLORS = {
  request: "color: #4FC3F7; font-weight: bold",
  response: "color: #81C784; font-weight: bold",
  error: "color: #E57373; font-weight: bold",
  info: "color: #FFB74D; font-weight: bold",
} as const

function formatTime(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })
}

export const logger = {
  /** API 请求日志 */
  request(method: string, url: string, body?: unknown): void {
    if (!isDev) return
    console.groupCollapsed(`%c→ ${method} ${url}  [${formatTime()}]`, COLORS.request)
    if (body) console.log("Body:", body)
    console.groupEnd()
  },

  /** API 响应日志 */
  response(method: string, url: string, status: number, data: unknown, durationMs: number): void {
    if (!isDev) return
    const color = status >= 400 ? COLORS.error : COLORS.response
    console.groupCollapsed(`%c← ${method} ${url}  ${status}  ${durationMs}ms  [${formatTime()}]`, color)
    console.log("Data:", data)
    console.groupEnd()
  },

  /** API 错误日志 */
  error(method: string, url: string, error: unknown): void {
    if (!isDev) return
    console.groupCollapsed(`%c✕ ${method} ${url}  [${formatTime()}]`, COLORS.error)
    console.error(error)
    console.groupEnd()
  },

  /** 通用信息日志 */
  info(label: string, ...args: unknown[]): void {
    if (!isDev) return
    console.log(`%c[${label}]`, COLORS.info, ...args)
  },
}
