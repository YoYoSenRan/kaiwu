import { useTranslation } from "react-i18next"

/**
 * 全局底部状态栏：左侧环境标识 + 版本号，右侧键盘提示。
 * 技术标识（DEV/v0.1.0）按 i18n 规则保持英文不翻译；用户提示走 t()。
 */
export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-border text-muted-foreground flex h-8 shrink-0 items-center justify-between border-t px-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono">v0.1.0</span>
        <span>·</span>
        <span className="font-mono">DEV</span>
      </div>
      <span className="font-mono">{t("common.toggleThemeHint")}</span>
    </footer>
  )
}
