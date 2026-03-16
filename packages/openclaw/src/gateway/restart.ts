/**
 * 重启 OpenClaw Gateway
 */
export async function restartGateway(): Promise<boolean> {
  try {
    const { execFile } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const execFileAsync = promisify(execFile)
    await execFileAsync("openclaw", ["gateway", "restart"])
    return true
  } catch {
    return false
  }
}
