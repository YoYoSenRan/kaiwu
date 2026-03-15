/**
 * Gateway 凭据管理
 * 使用 localStorage 缓存连接凭据，前缀 kaiwu-gw-
 */

const STORAGE_KEY_URL = "kaiwu-gw-url"
const STORAGE_KEY_TOKEN = "kaiwu-gw-token"
const STORAGE_KEY_DEVICE_TOKEN = "kaiwu-gw-device-token"

export interface GatewayCredentials {
  url: string
  token: string
  deviceToken?: string
}

/** 保存连接凭据到 localStorage */
export function saveCredentials(creds: GatewayCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY_URL, creds.url)
    localStorage.setItem(STORAGE_KEY_TOKEN, creds.token)
    if (creds.deviceToken) {
      localStorage.setItem(STORAGE_KEY_DEVICE_TOKEN, creds.deviceToken)
    }
  } catch {
    // localStorage 不可用（隐私模式等），静默忽略
  }
}

/** 从 localStorage 读取缓存的凭据 */
export function loadCredentials(): GatewayCredentials | null {
  try {
    const url = localStorage.getItem(STORAGE_KEY_URL)
    const token = localStorage.getItem(STORAGE_KEY_TOKEN)
    if (!url || !token) return null

    const deviceToken = localStorage.getItem(STORAGE_KEY_DEVICE_TOKEN) ?? undefined
    return { url, token, deviceToken }
  } catch {
    return null
  }
}

/** 清除所有缓存的凭据 */
export function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_URL)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_DEVICE_TOKEN)
  } catch {
    // 静默忽略
  }
}

/** 保存 Gateway 返回的设备令牌 */
export function saveDeviceToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_TOKEN, token)
  } catch {
    // 静默忽略
  }
}
