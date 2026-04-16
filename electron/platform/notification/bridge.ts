import { createBridge } from "../../app/bridge"
import type { NotificationBridge } from "./types"

const bridge = createBridge("notification")

export const notification: NotificationBridge = {
  show: (options) => bridge.invoke("show", options),
}
