import "./update.css"
import { useTranslation } from "react-i18next"
import { useUpdater } from "@/hooks/use-updater"
import Modal from "./modal"
import Progress from "./progress"

export default function Update() {
  const { t } = useTranslation()
  const { state, check, download, install, close } = useUpdater()

  const isOpen = state.type !== "idle"
  const isChecking = state.type === "checking"

  const cancelText = state.type === "available" ? t("common.cancel") : state.type === "ready" ? t("update.later") : t("common.confirm")

  const okText = state.type === "available" ? t("update.update") : state.type === "ready" ? t("update.installNow") : undefined

  const onOk = state.type === "available" ? download : state.type === "ready" ? install : undefined

  const hideFooter = state.type === "available"

  return (
    <>
      <Modal open={isOpen} cancelText={cancelText} okText={okText} onCancel={close} onOk={onOk} footer={hideFooter ? null : undefined}>
        <div className="modal-slot">
          {state.type === "error" && (
            <div>
              <p>{t("update.downloadError")}</p>
              <p>{state.info.message}</p>
            </div>
          )}

          {(state.type === "available" || state.type === "downloading" || state.type === "ready") && (
            <div>
              {"info" in state && (
                <>
                  <div>{t("update.newVersion", { version: state.info.newVersion ?? state.info.version })}</div>
                  <div className="new-version__target">
                    v{state.info.version} -&gt; v{state.info.newVersion ?? state.info.version}
                  </div>
                </>
              )}
              {state.type === "downloading" && "progress" in state && (
                <div className="update__progress">
                  <div className="progress__title">{t("update.updateProgress")}</div>
                  <div className="progress__bar">
                    <Progress percent={state.progress.percent} />
                  </div>
                </div>
              )}
            </div>
          )}

          {state.type === "checking" && <div className="can-not-available">{JSON.stringify({}, null, 2)}</div>}
        </div>
      </Modal>
      <button disabled={isChecking} onClick={check}>
        {isChecking ? t("update.checking") : t("update.checkUpdate")}
      </button>
    </>
  )
}
