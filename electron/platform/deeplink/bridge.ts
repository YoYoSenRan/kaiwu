import { createBridge } from "../../app/bridge"
import type { DeeplinkBridge, DeeplinkEvents } from "./types"

const bridge = createBridge<DeeplinkEvents>("deeplink")

export const deeplinkBridge: DeeplinkBridge = {
  onReceived: (listener) => bridge.on("event:received", listener),
}
