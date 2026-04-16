import { createBridge } from "../../app/bridge"
import type { LogBridge, ScopedLog } from "./types"

const bridge = createBridge("log")

export const log: LogBridge = {
  info: (...args) => bridge.send("output:write", "info", ...args),
  warn: (...args) => bridge.send("output:write", "warn", ...args),
  error: (...args) => bridge.send("output:write", "error", ...args),
  debug: (...args) => bridge.send("output:write", "debug", ...args),

  scope(name: string): ScopedLog {
    return {
      info: (...args) => bridge.send("output:scoped", name, "info", ...args),
      warn: (...args) => bridge.send("output:scoped", name, "warn", ...args),
      error: (...args) => bridge.send("output:scoped", name, "error", ...args),
      debug: (...args) => bridge.send("output:scoped", name, "debug", ...args),
    }
  },
}
