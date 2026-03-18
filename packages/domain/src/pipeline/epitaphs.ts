/**
 * 封存辞模板——MVP 用固定文案，不额外调用 Agent
 */

const EPITAPHS: Record<string, string> = {
  low_score: "市场尚未准备好。也许换个时机。",
  rejected: "掌秤否决。此物不造。",
  inspection_failed: "三次回炉仍未达标。此器暂封。",
  timeout: "超时了。也许这个想法太大了。",
  blocked_timeout: "造物流中断。局中人遇到了意料之外的困难。",
}

/** 获取封存辞 */
export function getEpitaph(reason: keyof typeof EPITAPHS): string {
  return EPITAPHS[reason] ?? "此物封存。"
}
