import { createBridge } from "../../app/bridge"
import type { DialogBridge } from "./types"

const bridge = createBridge("dialog")

export const dialog: DialogBridge = {
  openFile: (options) => bridge.invoke("open-file", options),
  saveFile: (options) => bridge.invoke("save-file", options),
  messageBox: (options) => bridge.invoke("message-box", options),
}
