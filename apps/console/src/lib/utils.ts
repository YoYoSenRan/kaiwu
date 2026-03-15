import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS className，解决冲突问题
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
