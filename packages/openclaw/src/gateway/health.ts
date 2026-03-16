import { OPENCLAW_GATEWAY_HOST, OPENCLAW_GATEWAY_PORT } from "../constants"

/**
 * 检查 Gateway 是否在运行
 */
export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const res = await fetch(`http://${OPENCLAW_GATEWAY_HOST}:${OPENCLAW_GATEWAY_PORT}/`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
