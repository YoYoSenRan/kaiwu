/**
 * 通用工具函数
 */

/** 合并 className（配合 Tailwind 使用） */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}
