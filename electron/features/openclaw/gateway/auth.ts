/**
 * Gateway WS 连接的设备密钥认证。
 *
 * 首次启动自动生成 Ed25519 密钥对并持久化到 userData/device-keys/。
 * 连接时用私钥对 challenge nonce 签名，gateway 用已注册公钥验签。
 * gateway 返回 deviceToken 后缓存，后续连接可直接用 token 认证。
 *
 * 签名 payload 格式（v2）：
 * v2|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}
 */

import { app } from "electron"
import { join } from "node:path"
import { mkdirSync } from "node:fs"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { createHash, createPublicKey, generateKeyPairSync, sign } from "node:crypto"

let cachedKeyPair: { privateKeyPem: string; publicKeyPem: string } | null = null

function getKeysDir(): string {
  return join(app.getPath("userData"), "device-keys")
}

/**
 * 确保 Ed25519 密钥对存在。首次调用自动生成并持久化。
 */
export function ensureDeviceKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  if (cachedKeyPair) return cachedKeyPair

  const keysDir = getKeysDir()
  const privPath = join(keysDir, "ed25519.pem")
  const pubPath = join(keysDir, "ed25519-pub.pem")

  if (existsSync(privPath) && existsSync(pubPath)) {
    cachedKeyPair = {
      privateKeyPem: readFileSync(privPath, "utf-8"),
      publicKeyPem: readFileSync(pubPath, "utf-8"),
    }
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

/** 获取 raw Ed25519 公钥（32 字节）。 */
function getRawPublicKey(): Buffer {
  const { publicKeyPem } = ensureDeviceKeyPair()
  const keyObj = createPublicKey(publicKeyPem)
  const spkiDer = keyObj.export({ type: "spki", format: "der" })
  // SPKI 封装的 Ed25519 公钥，raw 32 字节在末尾
  return (spkiDer as Buffer).subarray(-32)
}

/** 标准 base64 转 base64url。 */
function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")
}

/** 从公钥派生设备 ID：SHA-256(raw public key) → hex。 */
export function getDeviceId(): string {
  return createHash("sha256").update(getRawPublicKey()).digest("hex")
}

/** 获取公钥的 base64url 编码。 */
export function getPublicKeyBase64(): string {
  return toBase64Url(getRawPublicKey())
}

/**
 * 构建 v2 签名 payload 并签名。
 * @param params 签名所需的各字段
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
}): string {
  const { privateKeyPem } = ensureDeviceKeyPair()
  const payload = [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token ?? "",
    params.nonce,
  ].join("|")
  return toBase64Url(sign(null, Buffer.from(payload, "utf-8"), privateKeyPem))
}

// ---------- Device Token 缓存 ----------

const DEVICE_TOKEN_FILE = "device-token.json"

/** 缓存 gateway 返回的 deviceToken，后续连接可跳过签名。 */
export function cacheDeviceToken(token: string, deviceId: string): void {
  const filePath = join(getKeysDir(), DEVICE_TOKEN_FILE)
  try {
    writeFileSync(filePath, JSON.stringify({ token, deviceId, cachedAt: Date.now() }), { mode: 0o600 })
  } catch {
    // 写入失败不影响功能，下次连接会重新签名
  }
}

/** 读取缓存的 deviceToken，不存在或损坏返回 null。 */
export function getCachedDeviceToken(): string | null {
  const filePath = join(getKeysDir(), DEVICE_TOKEN_FILE)
  try {
    if (!existsSync(filePath)) return null
    const raw = readFileSync(filePath, "utf-8")
    if (!raw.trim()) return null
    return (JSON.parse(raw) as { token?: string }).token ?? null
  } catch {
    return null
  }
}

// ---------- Connect Params 构建 ----------

import type { ConnectChallenge, ConnectParams } from "./contract"
import { PROTOCOL_VERSION } from "./contract"

/**
 * 根据 challenge 和 token 构建完整的 connect 请求参数。
 * @param challenge 服务器下发的 nonce
 * @param token gateway 认证 token
 */
export function buildConnectParams(challenge: ConnectChallenge, token: string): ConnectParams {
  const deviceId = getDeviceId()
  const signedAt = Date.now()
  const cachedDeviceToken = getCachedDeviceToken()
  const signature = signChallenge({
    deviceId,
    clientId: "kaiwu",
    clientMode: "ui",
    role: "operator",
    scopes: ["operator.read", "operator.write"],
    signedAtMs: signedAt,
    token: token || cachedDeviceToken || "",
    nonce: challenge.nonce,
  })

  return {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: {
      id: "kaiwu",
      displayName: "Kaiwu",
      version: app.getVersion(),
      platform: process.platform,
      mode: "ui",
    },
    auth: { token, deviceToken: cachedDeviceToken ?? undefined },
    device: {
      id: deviceId,
      publicKey: getPublicKeyBase64(),
      signature,
      signedAt,
      nonce: challenge.nonce,
    },
  }
}
