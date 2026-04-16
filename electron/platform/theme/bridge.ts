import { createBridge } from "../../app/bridge"
import type { ThemeBridge, ThemeEvents, ThemeSource } from "./types"

const bridge = createBridge<ThemeEvents>("theme")

export const theme: ThemeBridge = {
  isDark: () => bridge.invoke("is-dark"),
  setSource: (source: ThemeSource) => bridge.invoke("set-source", source),
  onChange: (listener) => bridge.on("change", listener),
}
