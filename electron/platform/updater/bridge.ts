import { createBridge } from "../../app/bridge"
import type { UpdaterBridge, UpdaterEvents } from "./types"

const bridge = createBridge<UpdaterEvents>("updater")

export const updaterBridge: UpdaterBridge = {
  check: () => bridge.invoke("action:check"),
  download: () => bridge.invoke("action:download"),
  install: () => bridge.invoke("action:install"),

  onAvailable: (listener) => bridge.on("event:available", listener),
  onProgress: (listener) => bridge.on("event:progress", listener),
  onDone: (listener) => bridge.on("event:done", () => listener()),
  onError: (listener) => bridge.on("event:error", listener),
}
