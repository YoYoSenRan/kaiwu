import { useState, useEffect } from "react"
import { Minus, Square, Copy, X } from "lucide-react"

// 通过 userAgent 判断是否为 macOS
// macOS 使用系统原生红绿灯按钮，不需要渲染自定义按钮
const isMac = navigator.userAgent.includes("Macintosh")

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // 初始化时查询当前最大化状态
    window.electron.chrome.isMaximized().then(setIsMaximized)

    // 监听主进程推送的最大化状态变化，组件卸载时自动取消订阅
    const unsubscribe = window.electron.chrome.onMaximizedChange(setIsMaximized)
    return unsubscribe
  }, [])

  return (
    // -webkit-app-region: drag 使整个标题栏可拖拽移动窗口
    <div className="titlebar" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
      {/* macOS: 左侧留白给系统红绿灯按钮（约 70px） */}
      {isMac && <div className="titlebar-macos-spacer" />}

      {/* Win/Linux: 右侧自定义窗口控制按钮 */}
      {!isMac && (
        // no-drag: 按钮区域不参与拖拽，否则点击事件会被吞掉
        <div className="titlebar-controls" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <button className="titlebar-btn" onClick={() => window.electron.chrome.minimize()} aria-label="最小化">
            <Minus size={14} />
          </button>
          <button className="titlebar-btn" onClick={() => window.electron.chrome.maximize()} aria-label={isMaximized ? "还原" : "最大化"}>
            {/* 最大化状态显示还原图标（重叠矩形），否则显示单个矩形 */}
            {isMaximized ? <Copy size={12} /> : <Square size={12} />}
          </button>
          <button className="titlebar-btn titlebar-btn-close" onClick={() => window.electron.chrome.close()} aria-label="关闭">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
