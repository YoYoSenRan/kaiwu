import { powerMonitor } from "electron"
import { Controller, IpcController, type IpcLifecycle } from "../../framework"
import type { PowerEvent, PowerEvents } from "./types"

/**
 * 电源监控模块：监听系统休眠/恢复/锁屏/解锁事件，推送给 renderer。
 * 典型用途：休眠前保存状态、恢复后重连 WebSocket。
 */
@Controller("power")
export class PowerService extends IpcController<PowerEvents> implements IpcLifecycle {
  onReady(): void {
    const push = (event: PowerEvent) => this.emit("change", event)

    powerMonitor.on("suspend", () => push("suspend"))
    powerMonitor.on("resume", () => push("resume"))
    powerMonitor.on("lock-screen", () => push("lock"))
    powerMonitor.on("unlock-screen", () => push("unlock"))
  }
}
