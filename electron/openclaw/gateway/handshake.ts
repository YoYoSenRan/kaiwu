import type { ConnectChallenge, ConnectParams } from "./contract"
import { app } from "electron"
import { PROTOCOL_VERSION } from "./contract"
import { getCachedDeviceToken, getDeviceId, getPublicKeyBase64, signChallenge } from "./auth"

/** 向 gateway 自报的客户端身份常量。 */
export const CLIENT_IDENTITY = {
  mode: "ui",
  id: "gateway-client",
  displayName: "Kaiwu",
  version: app.getVersion(),
  platform: process.platform,
} as const

/**
 * 根据 challenge 和认证凭据构建 gateway connect 请求参数。
 * 若未提供显式 token，则自动附加 Ed25519 设备签名信息。
 * @param challenge 服务器下发的 challenge
 * @param auth 认证凭据（token 或 password）
 * @returns 符合 gateway 协议且包含设备签名的 connect 请求参数
 */
export function buildConnectParams(challenge: ConnectChallenge, auth: { token?: string; password?: string }): ConnectParams {
  const role = "operator"
  // 和 OpenClaw CLI 的 CLI_DEFAULT_OPERATOR_SCOPES 对齐：gateway 的 scope 是互斥分组而非层级包含，
  // admin 不隐含 read/write，调 agents.list / models.list 等读取类 RPC 必须显式申请 operator.read。
  const scopes = ["operator.read", "operator.admin", "operator.write", "operator.pairing", "operator.approvals", "operator.talk.secrets"]
  const signedAtMs = Date.now()
  // 无条件附 device 字段。gateway 采用 "device-bound scopes" 策略（server/ws-connection/message-handler.ts 注释）：
  // 没有 device 身份的 token/password 认证会触发 clearUnboundScopes 把 session scopes 清空，
  // 调任何需要 scope 的 RPC 都会丢 `missing scope: <xxx>`。
  // 首次连接会触发 gateway 的 silent local pairing（本地 + 非 browser origin）自动完成配对。
  const deviceToken = getCachedDeviceToken()
  const deviceId = getDeviceId()
  // 签名里的 token 字段必须和 gateway 的 resolveSignatureToken 优先级一致：auth.token > deviceToken > null。
  const signatureToken = auth.token ?? deviceToken ?? null

  const params: ConnectParams = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: { ...CLIENT_IDENTITY },
    auth: { token: auth.token, password: auth.password, deviceToken: deviceToken ?? undefined },
    role,
    scopes,
    device: {
      id: deviceId,
      signedAt: signedAtMs,
      nonce: challenge.nonce,
      signature: signChallenge({
        deviceId,
        clientId: CLIENT_IDENTITY.id,
        clientMode: CLIENT_IDENTITY.mode,
        role,
        scopes,
        signedAtMs,
        token: signatureToken,
        nonce: challenge.nonce,
        platform: CLIENT_IDENTITY.platform,
      }),
      publicKey: getPublicKeyBase64(),
    },
  }

  return params
}
