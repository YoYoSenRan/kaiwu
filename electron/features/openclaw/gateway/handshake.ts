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
  const scopes = ["operator.admin"]
  const signedAtMs = Date.now()

  const params: ConnectParams = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: { ...CLIENT_IDENTITY },
    auth: { token: auth.token, password: auth.password },
    role,
    scopes,
  }

  if (!auth.token) {
    const deviceToken = getCachedDeviceToken()
    const deviceId = getDeviceId()
    params.auth.deviceToken = deviceToken ?? undefined
    params.device = {
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
        token: deviceToken,
        nonce: challenge.nonce,
        platform: CLIENT_IDENTITY.platform,
      }),
      publicKey: getPublicKeyBase64(),
    }
  }

  return params
}
