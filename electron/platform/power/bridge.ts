import { createBridge } from "../../app/bridge"
import type { PowerBridge, PowerEvents } from "./types"

const bridge = createBridge<PowerEvents>("power")

export const power: PowerBridge = {
  onChange: (listener) => bridge.on("change", listener),
}
