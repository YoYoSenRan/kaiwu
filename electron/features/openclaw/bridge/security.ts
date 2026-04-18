import crypto from "node:crypto"

/**
 * 生成 bridge server 的随机鉴权 token。
 * 24 字节十六进制 = 48 字符，足以抵抗离线暴破。
 */
export function generateBridgeToken(): string {
  return crypto.randomBytes(24).toString("hex")
}

/**
 * 从 WebSocket 连接 URL 的 query 中提取 token。
 * @param url 原始 request URL（可能包含 query）
 */
export function extractTokenFromUrl(url: string): string | null {
  const match = url.match(/[?&]token=([^&]+)/)
  return match ? decodeURIComponent(match[1]!) : null
}

/**
 * 校验连接携带的 token 是否匹配期望值。
 * 空 token 一律拒绝，避免未初始化状态被误接受。
 */
export function verifyToken(provided: string | null, expected: string): boolean {
  if (!provided || provided.length === 0) return false
  if (!expected || expected.length === 0) return false
  return provided === expected
}
