/**
 * 指数退避——cron 间隔 × 2^(failCount-2)，上限 120 分钟
 *
 * 退避通过更新 cron job 间隔实现，stale 检测阈值自动跟随
 * （因为 stale 阈值从 cron 间隔派生）。
 */
import { BACKOFF_CEILING_MS } from "./constants"

/**
 * 计算退避后的 cron 间隔
 *
 * @param currentIntervalMs - 当前 cron 间隔（毫秒）
 * @param failCount - 失败次数（L3 时 failCount=3）
 * @returns 退避后的间隔（毫秒），不超过 BACKOFF_CEILING_MS
 */
export function calculateBackoffInterval(currentIntervalMs: number, failCount: number): number {
  const exponent = Math.max(0, failCount - 2)
  const backoff = currentIntervalMs * 2 ** exponent
  return Math.min(backoff, BACKOFF_CEILING_MS)
}
