import { createBridge } from "../../app/bridge"
import type { ShellBridge } from "./types"

const bridge = createBridge("shell")

export const shell: ShellBridge = {
  openExternal: (url) => bridge.invoke("open-external", url),
  showInFolder: (path) => bridge.invoke("show-in-folder", path),
  openPath: (path) => bridge.invoke("open-path", path),
}
