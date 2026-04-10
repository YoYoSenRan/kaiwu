/**
 * Gateway WS 连接的设备密钥认证。
 *
 * 首次启动自动生成 Ed25519 密钥对并持久化到 userData/device-keys/。
 * 连接时用私钥对 challenge nonce 签名，gateway 用已注册公钥验签。
 * gateway 返回 deviceToken 后缓存，后续连接可直接用 token 认证。
 *
 * 签名 payload 格式（v3）：
 * v3|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}|{platform}|{deviceFamily}
 */

import { app } from "electron"
import { join } from "node:path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createHash, createPublicKey, generateKeyPairSync, sign } from "node:crypto"

let cachedKeyPair: { privateKeyPem: string; publicKeyPem: string } | null = null

/**
 * 获取 device-keys 目录路径。
 * 指向 userData 下的 device-keys 子目录，用于存放 Ed25519 密钥对和 deviceToken 缓存。
 * @returns 绝对路径字符串
 */
function getKeysDir(): string {
  return join(app.getPath("userData"), "device-keys")
}

/**
 * 确保 Ed25519 密钥对存在。
 * 首次调用自动生成并持久化到 userData/device-keys/，后续直接读取缓存。
 * @returns 包含 PEM 格式私钥和公钥的对象
 */
export function ensureDeviceKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  if (cachedKeyPair) return cachedKeyPair

  const keysDir = getKeysDir()
  const privPath = join(keysDir, "ed25519.pem")
  const pubPath = join(keysDir, "ed25519-pub.pem")

  if (existsSync(privPath) && existsSync(pubPath)) {
    cachedKeyPair = { privateKeyPem: readFileSync(privPath, "utf-8"), publicKeyPem: readFileSync(pubPath, "utf-8") }
    return cachedKeyPair
  }

  mkdirSync(keysDir, { recursive: true })
  const { privateKey, publicKey } = generateKeyPairSync("ed25519")
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string
  const pubPem = publicKey.export({ type: "spki", format: "pem" }) as string

  writeFileSync(privPath, privPem, { mode: 0o600 })
  writeFileSync(pubPath, pubPem, { mode: 0o644 })

  cachedKeyPair = { privateKeyPem: privPem, publicKeyPem: pubPem }
  return cachedKeyPair
}

/**
 * 从 PEM 公钥中提取 raw Ed25519 公钥（32 字节）。
 * SPKI 封装格式中 raw 公钥位于 DER 数据的末尾。
 * @returns 32 字节的 raw 公钥 Buffer
 */
function getRawPublicKey(): Buffer {
  const { publicKeyPem } = ensureDeviceKeyPair()
  const keyObj = createPublicKey(publicKeyPem)
  const spkiDer = keyObj.export({ type: "spki", format: "der" })
  return (spkiDer as Buffer).subarray(-32)
}

/**
 * 将标准 base64 字符串转换为 base64url 编码。
 * 替换 + → -、/ → _，并移除末尾的 = 填充。
 * @param buf 原始二进制数据
 * @returns base64url 编码字符串
 */
function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")
}

/**
 * 从公钥派生设备 ID。
 * 对 raw 公钥做 SHA-256 后取 hex，作为该设备在 gateway 中的唯一标识。
 * @returns 64 位十六进制字符串
 */
export function getDeviceId(): string {
  return createHash("sha256").update(getRawPublicKey()).digest("hex")
}

/**
 * 获取公钥的 base64url 编码。
 * gateway 验签时需要用与签名一致的 base64url 格式公钥。
 * @returns base64url 编码的公钥字符串
 */
export function getPublicKeyBase64(): string {
  return toBase64Url(getRawPublicKey())
}

/**
 * 构建 v3 签名 payload 并用 Ed25519 私钥签名。
 * @param params 签名所需的各字段
 * @param params.deviceId 设备唯一标识
 * @param params.clientId 客户端 ID
 * @param params.clientMode 客户端模式
 * @param params.role 申请的角色
 * @param params.scopes 申请的权限范围列表
 * @param params.signedAtMs 签名时间戳（毫秒）
 * @param params.token 用于签名的认证 token，可为 null
 * @param params.nonce 服务器 challenge 下发的 nonce
 * @param params.platform 平台标识
 * @param params.deviceFamily 设备族标识
 * @returns base64url 编码的签名结果
 */
export function signChallenge(params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token: string | null
  nonce: string
  platform?: string | null
  deviceFamily?: string | null
}): string {
  const { privateKeyPem } = ensureDeviceKeyPair()
  const payload = [
    "v3",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token ?? "",
    params.nonce,
    params.platform ?? "",
    params.deviceFamily ?? "",
  ].join("|")
  return toBase64Url(sign(null, Buffer.from(payload, "utf-8"), privateKeyPem))
}

/**
 * 缓存 gateway 返回的 deviceToken。
 * 后续连接若 token 仍有效，可直接用 token 认证而跳过 Ed25519 签名。
 * @param token gateway 颁发的 deviceToken
 * @param deviceId 当前设备 ID，用于与缓存文件中的设备做校验
 */
export function cacheDeviceToken(token: string, deviceId: string): void {
  const filePath = join(getKeysDir(), "device-token.json")
  try {
    writeFileSync(filePath, JSON.stringify({ token, deviceId, cachedAt: Date.now() }), { mode: 0o600 })
  } catch {
    // 写入失败不影响功能，下次连接会重新签名
  }
}

/**
 * 读取缓存的 deviceToken。
 * 文件不存在或解析失败时静默返回 null，不会阻断连接流程。
 * @returns 缓存的 deviceToken，或 null
 */
export function getCachedDeviceToken(): string | null {
  const filePath = join(getKeysDir(), "device-token.json")
  try {
    if (!existsSync(filePath)) return null
    const raw = readFileSync(filePath, "utf-8")
    if (!raw.trim()) return null
    return (JSON.parse(raw) as { token?: string }).token ?? null
  } catch {
    return null
  }
}
