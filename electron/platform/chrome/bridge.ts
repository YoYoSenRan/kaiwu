import { createBridge } from "../../app/bridge"
import type { ChromeBridge, ChromeEvents } from "./types"

const bridge = createBridge<ChromeEvents>("chrome")

export const chromeBridge: ChromeBridge = {
  minimize: () => bridge.invoke("window:minimize"),
  maximize: () => bridge.invoke("window:maximize"),
  close: () => bridge.invoke("window:close"),
  state: () => bridge.invoke<boolean>("window:state"),
  open: (path) => bridge.invoke("open", path),
  onChange: (listener) => bridge.on("window:change", listener),
}
