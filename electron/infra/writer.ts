import fs from "node:fs"
import path from "node:path"

/** 每个日志文件的行数上限。 */
const LINES_PER_FILE = 100

/**
 * 按天建目录、按行数拆文件的日志写入器。
 *
 * 目录结构：`<base>/YYYY-MM-DD/001.log`, `002.log`, ...
 * 每个文件写满 LINES_PER_FILE 行后滚动到下一个序号文件。
 * 启动时自动检测已有文件，续接序号和行数。
 */
export class LogWriter {
  private date = ""
  private seq = 1
  private lines = 0
  private readonly base: string

  constructor(base: string) {
    this.base = base
  }

  /** 写入一行。自动处理日期切换和文件滚动。 */
  write(text: string): void {
    const date = today()
    if (date !== this.date) {
      this.date = date
      this.resume(date)
    }
    if (this.lines >= LINES_PER_FILE) {
      this.seq++
      this.lines = 0
    }
    const dir = path.join(this.base, date)
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, seqName(this.seq)), text + "\n")
    this.lines++
  }

  /** 检测当天已有文件，续接序号和行数。 */
  private resume(date: string): void {
    const dir = path.join(this.base, date)
    if (!fs.existsSync(dir)) {
      this.seq = 1
      this.lines = 0
      return
    }
    const logs = fs
      .readdirSync(dir)
      .filter((f) => /^\d+\.log$/.test(f))
      .sort()
    if (logs.length === 0) {
      this.seq = 1
      this.lines = 0
      return
    }
    const last = logs[logs.length - 1]
    this.seq = parseInt(last, 10)
    const count = fs.readFileSync(path.join(dir, last), "utf-8").split("\n").filter(Boolean).length
    if (count >= LINES_PER_FILE) {
      this.seq++
      this.lines = 0
    } else {
      this.lines = count
    }
  }
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function seqName(n: number): string {
  return `${String(n).padStart(3, "0")}.log`
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}
