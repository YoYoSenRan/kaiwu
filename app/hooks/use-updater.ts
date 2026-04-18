import { useCallback, useEffect, useReducer } from "react"
import type { ProgressInfo } from "electron-updater"

type UpdaterState =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "available"; info: VersionInfo }
  | { type: "downloading"; info: VersionInfo; progress: Partial<ProgressInfo> }
  | { type: "ready"; info: VersionInfo }
  | { type: "error"; info: ErrorType }

type UpdaterAction =
  | { type: "check" }
  | { type: "available"; info: VersionInfo }
  | { type: "download" }
  | { type: "progress"; progress: Partial<ProgressInfo> }
  | { type: "ready" }
  | { type: "error"; info: ErrorType }
  | { type: "close" }

function reducer(state: UpdaterState, action: UpdaterAction): UpdaterState {
  switch (action.type) {
    case "check":
      return { type: "checking" }
    case "available":
      return { type: "available", info: action.info }
    case "download":
      return state.type === "available" ? { type: "downloading", info: state.info, progress: { percent: 0 } } : state
    case "progress":
      return state.type === "downloading" ? { ...state, progress: action.progress } : state
    case "ready":
      return state.type === "downloading" ? { type: "ready", info: state.info } : state
    case "error":
      return { type: "error", info: action.info }
    case "close":
      return { type: "idle" }
    default:
      return state
  }
}

/**
 * 自动更新状态机 hook。
 *
 * 封装 updater 事件订阅与状态流转：
 * idle → checking → [available | error]
 * available → downloading → ready → install
 */
export function useUpdater() {
  const [state, dispatch] = useReducer(reducer, { type: "idle" })

  const check = useCallback(async () => {
    dispatch({ type: "check" })
    const result = await window.electron.updater.check()
    if (result) dispatch({ type: "error", info: result })
  }, [])

  const download = useCallback(() => {
    if (state.type === "available") {
      dispatch({ type: "download" })
      window.electron.updater.download()
    }
  }, [state.type])

  const install = useCallback(() => {
    window.electron.updater.install()
  }, [])

  const close = useCallback(() => {
    dispatch({ type: "close" })
  }, [])

  useEffect(() => {
    const unsubs = [
      window.electron.updater.onAvailable((info) => dispatch({ type: "available", info })),
      window.electron.updater.onProgress((progress) => dispatch({ type: "progress", progress })),
      window.electron.updater.onDone(() => dispatch({ type: "ready" })),
      window.electron.updater.onError((info) => dispatch({ type: "error", info })),
    ]
    return () => unsubs.forEach((off) => off())
  }, [])

  return { state, check, download, install, close }
}
