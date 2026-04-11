import { useTranslation } from "react-i18next"

/**
 * 全局底部状态栏：24px 细条，左侧在线状态点 + 环境代码，右侧版本号。
 * 技术标识（ONLINE/DEV/vX.Y.Z）按 i18n 规则保持英文不翻译；用户提示走 t()。
 */
export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-border px-10 font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full deck-accent-bg deck-pulse" />
        <span>ONLINE</span>
        <span className="text-border">·</span>
        <span>DEV</span>
      </div>
      <div className="flex items-center gap-2">
        <span>v0.1.0</span>
        <span className="text-border">·</span>
        <span>{t("deck.footer.hint")}</span>
      </div>
    </footer>
  )
}
