import { spawn } from "node:child_process"
import { isWin } from "../../../infra/env"

/** runCli 结果。code 为 null 表示进程被超时杀掉。 */
export interface CliResult {
  code: number | null
  stdout: string
  stderr: string
}

/**
 * 运行 `openclaw <args>` 并返回结果。
 * 超时强制 kill。spawn 错误(ENOENT 等)resolve code=null 而不是抛错——调用方按业务语义解释。
 */
export function runCli(args: string[], timeoutMs: number): Promise<CliResult> {
  return new Promise((resolve) => {
    let settled = false
    const done = (r: CliResult) => {
      if (settled) return
      settled = true
      resolve(r)
    }

    const child = spawn("openclaw", args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: isWin,
    })
    let stdout = ""
    let stderr = ""

    const timer = setTimeout(() => {
      child.kill()
      done({ code: null, stdout, stderr })
    }, timeoutMs)

    child.stdout?.on("data", (d: Buffer) => (stdout += d.toString("utf-8")))
    child.stderr?.on("data", (d: Buffer) => (stderr += d.toString("utf-8")))
    child.once("error", () => {
      clearTimeout(timer)
      done({ code: null, stdout, stderr })
    })
    child.once("exit", (code) => {
      clearTimeout(timer)
      done({ code, stdout, stderr })
    })
  })
}
