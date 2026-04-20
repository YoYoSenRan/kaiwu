/**
 * 聊天滚动跟随底部 hook。
 *
 * 职责:
 * - 自动吸附底部:消息新增 / 流式增长 / 尺寸变化 时滚到底
 * - 用户手动上滚脱离吸附,显示"回到底部"按钮;点击回归吸附
 * - session 切换重置吸附状态
 *
 * 用法:
 * ```
 * const { scrollAreaRef, contentRef, showJumpBtn, jumpToBottom, handleScroll, markFollow } = useFollowBottom({
 *   resetKey: currentSessionId,
 *   changeSig: messages.length,
 *   streamingSig,
 *   streamJustStarted,
 * })
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

interface Options {
  /** 切换这个 key 会重置吸附(通常 sessionId)。 */
  resetKey: string | null
  /** 任意变化计数(消息数 / 流式字符数累加等),变化触发吸附滚动。 */
  changeSig: number
  /** 流式字符累计签名,和 changeSig 同语义,独立触发也行。 */
  streamingSig: number
  /** 本轮 render 是否有流刚开始(用来强制吸附,即使用户已上滚也要回底部)。 */
  streamJustStarted: boolean
}

interface FollowBottomApi {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  showJumpBtn: boolean
  jumpToBottom: () => void
  handleScroll: () => void
  /** 外部显式要求下一次吸附(例如发送消息时)。 */
  markFollow: () => void
}

export function useFollowBottom({ resetKey, changeSig, streamingSig, streamJustStarted }: Options): FollowBottomApi {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const followBottomRef = useRef(true)
  const programmaticScrollRef = useRef(false)
  const scrollRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showJumpBtn, setShowJumpBtn] = useState(false)

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  const scrollToBottom = useCallback(
    (smooth = false) => {
      const el = scrollAreaRef.current
      if (!el) return
      programmaticScrollRef.current = true
      setShowJumpBtn(false)
      const useSmooth = smooth && !prefersReducedMotion
      const top = el.scrollHeight
      if (typeof el.scrollTo === "function" && useSmooth) {
        el.scrollTo({ top, behavior: "smooth" })
      } else {
        el.scrollTop = top
      }
      // smooth 动画期间 handleScroll 必须保持静默,否则 distance 一度 > 阈值会闪出 JumpBtn。
      // 优先监听 scrollend(Chromium 114+);无则用 600ms 超时兜底。instant 模式立刻解锁。
      if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current)
      const unlock = () => {
        programmaticScrollRef.current = false
        scrollRetryTimeoutRef.current = null
      }
      if (useSmooth) {
        let unlocked = false
        const onEnd = () => {
          if (unlocked) return
          unlocked = true
          el.removeEventListener("scrollend", onEnd)
          if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current)
          unlock()
        }
        el.addEventListener("scrollend", onEnd, { once: true })
        scrollRetryTimeoutRef.current = setTimeout(onEnd, 600)
      } else {
        scrollRetryTimeoutRef.current = setTimeout(unlock, 0)
      }
    },
    [prefersReducedMotion],
  )

  // 滞后阈值:防止 streaming 过程中 scrollHeight 持续增长导致 distance 在临界反复穿越,
  // 造成按钮忽显忽隐。ENTER(小值)才进入吸底态,EXIT(大值)才退出。
  const AT_BOTTOM_ENTER = 40
  const AT_BOTTOM_EXIT = 160
  const handleScroll = useCallback(() => {
    if (programmaticScrollRef.current) return
    const el = scrollAreaRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const current = followBottomRef.current
    const next = current ? distance <= AT_BOTTOM_EXIT : distance < AT_BOTTOM_ENTER
    if (next === current) return
    followBottomRef.current = next
    setShowJumpBtn(!next)
  }, [])

  const jumpToBottom = useCallback(() => {
    followBottomRef.current = true
    setShowJumpBtn(false)
    scrollToBottom(true)
  }, [scrollToBottom])

  const markFollow = useCallback(() => {
    followBottomRef.current = true
  }, [])

  // session 切换:重置吸附(showJumpBtn 由 scrollToBottom 内部清零)
  // 滚动 DOM 与 setShowJumpBtn(false) 是原子操作,接受 set-state-in-effect 警告
  useEffect(() => {
    followBottomRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    scrollToBottom()
  }, [resetKey, scrollToBottom])

  // 消息/流式变化:吸附或忽略
  useEffect(() => {
    if (!followBottomRef.current && !streamJustStarted) return
    if (streamJustStarted) followBottomRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    scrollToBottom()
  }, [changeSig, streamingSig, streamJustStarted, scrollToBottom])

  // 内容尺寸变化(markdown 渲染完 / 图片加载等):吸附中时补一次
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const ro = new ResizeObserver(() => {
      if (followBottomRef.current) scrollToBottom()
    })
    ro.observe(content)
    return () => {
      ro.disconnect()
      if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current)
    }
  }, [scrollToBottom])

  return { scrollAreaRef, contentRef, showJumpBtn, jumpToBottom, handleScroll, markFollow }
}
