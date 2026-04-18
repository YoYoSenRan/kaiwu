import { createBridge } from "../../app/bridge"
import type { ClipboardBridge } from "./types"

const bridge = createBridge("clipboard")

export const clipboard: ClipboardBridge = {
  readText: () => bridge.invoke("read-text"),
  writeText: (text) => bridge.invoke("write-text", text),
  readImage: () => bridge.invoke("read-image"),
  writeImage: (dataUrl) => bridge.invoke("write-image", dataUrl),
}
