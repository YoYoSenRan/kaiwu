import { createBridge } from "../../app/bridge"
import type { ClipboardBridge } from "./types"

const bridge = createBridge("clipboard")

export const clipboardBridge: ClipboardBridge = {
  readText: () => bridge.invoke("read-text"),
  writeText: (text) => bridge.invoke("write-text", text),
  readImage: () => bridge.invoke("read-image"),
  writeImage: (dataUrl) => bridge.invoke("write-image", dataUrl),
}
