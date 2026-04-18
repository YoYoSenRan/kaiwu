import { Copy, Minus, Square, X, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

const isMac = navigator.userAgent.includes("Macintosh")

export function TitleBar() {
  const { t } = useTranslation()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electron.chrome.state().then(setIsMaximized)
    const unsubscribe = window.electron.chrome.onChange(setIsMaximized)
    return unsubscribe
  }, [])

  return (
    <div
      className="titlebar border-border/40 bg-background/80 border-b px-2 backdrop-blur-xl transition-colors"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      onDoubleClick={() => window.electron.chrome.maximize()}
    >
      {/* 左右三等分，确保中间的 Omnibar 绝对居中 */}
      <div className="flex flex-1 items-center">{isMac && <div className="titlebar-macos-spacer" />}</div>

      <div className="flex flex-1 justify-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button className="group border-border/50 bg-muted/40 text-muted-foreground hover:border-border/80 hover:bg-muted/80 flex h-8 w-[320px] items-center gap-2 rounded-lg border px-3 text-xs transition-all">
          <Search size={14} className="opacity-50 transition-opacity group-hover:opacity-100" />
          <span className="flex-1 text-left tracking-wide">{t("layout.omnibar.placeholder")}</span>
          <kbd className="border-border/60 bg-background/50 pointer-events-none hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} onDoubleClick={(e) => e.stopPropagation()}>
        {!isMac && (
          <div className="titlebar-controls ml-2 flex h-full">
            <button className="titlebar-btn" onClick={() => window.electron.chrome.minimize()} aria-label="最小化">
              <Minus size={14} />
            </button>
            <button className="titlebar-btn" onClick={() => window.electron.chrome.maximize()} aria-label={isMaximized ? "还原" : "最大化"}>
              {isMaximized ? <Copy size={12} /> : <Square size={12} />}
            </button>
            <button className="titlebar-btn titlebar-btn-close" onClick={() => window.electron.chrome.close()} aria-label="关闭">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
