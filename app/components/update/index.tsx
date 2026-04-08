import type { ProgressInfo } from "electron-updater"
import { useCallback, useEffect, useState } from "react"
import Modal from "./modal"
import Progress from "./progress"
import "./update.css"

const Update = () => {
  const [checking, setChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [versionInfo, setVersionInfo] = useState<VersionInfo>()
  const [updateError, setUpdateError] = useState<ErrorType>()
  const [progressInfo, setProgressInfo] = useState<Partial<ProgressInfo>>()
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [modalBtn, setModalBtn] = useState<{
    cancelText?: string
    okText?: string
    onCancel?: () => void
    onOk?: () => void
  }>({
    onCancel: () => setModalOpen(false),
    onOk: () => window.electron.updater.startDownload(),
  })

  const checkUpdate = async () => {
    setChecking(true)
    const result = await window.electron.updater.check()
    setProgressInfo({ percent: 0 })
    setChecking(false)
    setModalOpen(true)
    // check() 失败时返回 { message, error } 错误对象，成功时返回 null
    // （成功时的可用性结果通过 onCanAvailable 事件推送）
    if (result) {
      setUpdateAvailable(false)
      setUpdateError(result)
    }
  }

  const onUpdateCanAvailable = useCallback((info: VersionInfo) => {
    setVersionInfo(info)
    setUpdateError(undefined)
    // 有可用更新时切换按钮文案
    if (info.update) {
      setModalBtn((state) => ({
        ...state,
        cancelText: "Cancel",
        okText: "Update",
        onOk: () => window.electron.updater.startDownload(),
      }))
      setUpdateAvailable(true)
    } else {
      setUpdateAvailable(false)
    }
  }, [])

  const onUpdateError = useCallback((info: ErrorType) => {
    setUpdateAvailable(false)
    setUpdateError(info)
  }, [])

  const onDownloadProgress = useCallback((info: ProgressInfo) => {
    setProgressInfo(info)
  }, [])

  const onUpdateDownloaded = useCallback(() => {
    setProgressInfo({ percent: 100 })
    setModalBtn((state) => ({
      ...state,
      cancelText: "Later",
      okText: "Install now",
      onOk: () => window.electron.updater.quitAndInstall(),
    }))
  }, [])

  useEffect(() => {
    // 每个订阅都返回取消函数，组件卸载时统一清理
    const unsubscribers = [
      window.electron.updater.onCanAvailable(onUpdateCanAvailable),
      window.electron.updater.onError(onUpdateError),
      window.electron.updater.onDownloadProgress(onDownloadProgress),
      window.electron.updater.onDownloaded(onUpdateDownloaded),
    ]

    return () => {
      unsubscribers.forEach((off) => off())
    }
  }, [onUpdateCanAvailable, onUpdateError, onDownloadProgress, onUpdateDownloaded])

  return (
    <>
      <Modal
        open={modalOpen}
        cancelText={modalBtn?.cancelText}
        okText={modalBtn?.okText}
        onCancel={modalBtn?.onCancel}
        onOk={modalBtn?.onOk}
        footer={updateAvailable ? /* hide footer */ null : undefined}
      >
        <div className="modal-slot">
          {updateError ? (
            <div>
              <p>Error downloading the latest version.</p>
              <p>{updateError.message}</p>
            </div>
          ) : updateAvailable ? (
            <div>
              <div>The last version is: v{versionInfo?.newVersion}</div>
              <div className="new-version__target">
                v{versionInfo?.version} -&gt; v{versionInfo?.newVersion}
              </div>
              <div className="update__progress">
                <div className="progress__title">Update progress:</div>
                <div className="progress__bar">
                  <Progress percent={progressInfo?.percent}></Progress>
                </div>
              </div>
            </div>
          ) : (
            <div className="can-not-available">{JSON.stringify(versionInfo ?? {}, null, 2)}</div>
          )}
        </div>
      </Modal>
      <button disabled={checking} onClick={checkUpdate}>
        {checking ? "Checking..." : "Check update"}
      </button>
    </>
  )
}

export default Update
