import { isDev } from "./env"
import { session } from "electron"

// 开发环境 CSP：允许 Vite HMR 所需的 unsafe-eval 和本地 WebSocket
const DEV_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https:; " +
  "font-src 'self' data:; " +
  "connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; " +
  "media-src 'self'; " +
  "object-src 'none'"

// 生产环境 CSP：严格限制，仅允许必要的外部 HTTPS 资源
const PROD_CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https:; " +
  "font-src 'self' data:; " +
  "connect-src 'self' https:; " +
  "media-src 'self'; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "frame-ancestors 'none'"

/**
 * 注入 Content-Security-Policy 响应头。
 * 通过 HTTP 响应头比 meta 标签更安全，无法被页面脚本篡改。
 */
export function setupCSP(): void {
  const csp = isDev ? DEV_CSP : PROD_CSP

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    })
  })
}
