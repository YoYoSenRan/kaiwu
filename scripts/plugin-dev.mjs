#!/usr/bin/env node
/**
 * kaiwu 插件开发辅助脚本。
 *
 * 用法：
 *   node scripts/plugin-dev.mjs          # watch：首次全量同步 + 增量同步 + 自动重启
 *   node scripts/plugin-dev.mjs --once   # 一次性同步，不 watch
 *   node scripts/plugin-dev.mjs --check  # 只检查 OpenClaw 兼容性
 */
import { spawn } from "node:child_process"
import chokidar from "chokidar"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promises as fs } from "node:fs"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PLUGIN_SRC = path.join(REPO_ROOT, "plugins", "kaiwu")
const EXCLUDE = new Set(["node_modules", ".git", ".DS_Store", "dist", ".kaiwu-handshake.json"])
const DEBOUNCE_MS = 300
const RESTART_TIMEOUT_MS = 10_000
const IS_WIN = process.platform === "win32"

const args = process.argv.slice(2)
const MODE = args.includes("--check") ? "check" : args.includes("--once") ? "once" : "watch"

// ---------- 日志 ----------
const col = (n) => (s) => `\x1b[${n}m${s}\x1b[0m`
const gray = col(90),
  green = col(32),
  red = col(31),
  yellow = col(33),
  cyan = col(36)
const prefix = gray("[plugin-dev]")
const log = {
  info: (m) => console.log(`${prefix} ${m}`),
  ok: (m) => console.log(`${prefix} ${green("✓")} ${m}`),
  warn: (m) => console.log(`${prefix} ${yellow("!")} ${m}`),
  err: (m) => console.log(`${prefix} ${red("✗")} ${m}`),
  step: (m) => console.log(`${prefix} ${cyan("→")} ${m}`),
}

// ---------- 路径 ----------
function resolveExtensionsDir() {
  const override = process.env.OPENCLAW_HOME
  if (override) return path.join(override, "extensions")
  if (IS_WIN) {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming")
    return path.join(appData, ".openclaw", "extensions")
  }
  return path.join(os.homedir(), ".openclaw", "extensions")
}

// ---------- 子进程包装 ----------
function runCli(args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn("openclaw", args, { stdio: ["ignore", "pipe", "pipe"], shell: IS_WIN })
    let stdout = "",
      stderr = ""
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, stdout, stderr, error: "timeout" })
    }, timeoutMs)
    child.stdout.on("data", (d) => (stdout += d.toString("utf-8")))
    child.stderr.on("data", (d) => (stderr += d.toString("utf-8")))
    child.once("error", (err) => {
      clearTimeout(timer)
      resolve({ ok: false, stdout, stderr, error: err.message })
    })
    child.once("exit", (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, stdout, stderr, error: code !== 0 ? stderr || `exit ${code}` : undefined })
    })
  })
}

async function getVersion() {
  const r = await runCli(["--version"], 3000)
  if (!r.ok) return null
  return r.stdout.match(/\d+\.\d+\.\d+(?:[.-][\w.]+)?/)?.[0] ?? null
}

async function restartOpenclaw() {
  return await runCli(["gateway", "restart"], RESTART_TIMEOUT_MS)
}

// ---------- 文件同步 ----------
async function walk(src, dst, stats) {
  await fs.mkdir(dst, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const e of entries) {
    if (EXCLUDE.has(e.name)) continue
    const s = path.join(src, e.name),
      d = path.join(dst, e.name)
    if (e.isDirectory()) await walk(s, d, stats)
    else if (e.isFile()) {
      await fs.copyFile(s, d)
      stats.files += 1
    }
  }
}

async function syncAll(target) {
  await fs.mkdir(target, { recursive: true })
  const stats = { files: 0 }
  await walk(PLUGIN_SRC, target, stats)
  return stats.files
}

async function syncFile(target, relPath) {
  const src = path.join(PLUGIN_SRC, relPath),
    dst = path.join(target, relPath)
  await fs.mkdir(path.dirname(dst), { recursive: true })
  try {
    await fs.copyFile(src, dst)
    log.ok(`synced ${relPath}`)
  } catch (err) {
    log.err(`sync ${relPath} failed: ${err.message}`)
  }
}

async function removeFile(target, relPath) {
  try {
    await fs.rm(path.join(target, relPath), { force: true })
    log.ok(`removed ${relPath}`)
  } catch {
    // ignore
  }
}

// ---------- 主流程 ----------
async function main() {
  const target = path.join(resolveExtensionsDir(), "kaiwu")
  log.info(`source:  ${PLUGIN_SRC}`)
  log.info(`target:  ${target}`)

  const version = await getVersion()
  if (version) log.ok(`OpenClaw host version: ${version}`)
  else log.warn("OpenClaw CLI not found in PATH; 重启功能将不可用")

  if (MODE === "check") {
    log.info("check mode: no sync performed")
    return
  }

  log.step("initial sync…")
  const files = await syncAll(target)
  log.ok(`synced ${files} files`)

  if (MODE === "once") return

  log.step("watching for changes…")
  const watcher = chokidar.watch(PLUGIN_SRC, {
    ignoreInitial: true,
    ignored: (p) => EXCLUDE.has(path.basename(p)),
  })

  let pending = null
  let timer = null
  const flush = async () => {
    timer = null
    const ops = pending ?? []
    pending = null
    if (ops.length === 0) return
    for (const op of ops) {
      const rel = path.relative(PLUGIN_SRC, op.path)
      if (op.kind === "remove") await removeFile(target, rel)
      else await syncFile(target, rel)
    }
    log.step("restarting OpenClaw gateway…")
    const r = await restartOpenclaw()
    if (r.ok) log.ok("gateway restarted")
    else log.err(`restart failed: ${r.error}`)
  }
  const queue = (kind, p) => {
    pending = pending ?? []
    pending.push({ kind, path: p })
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, DEBOUNCE_MS)
  }

  watcher.on("add", (p) => queue("add", p))
  watcher.on("change", (p) => queue("add", p))
  watcher.on("unlink", (p) => queue("remove", p))

  process.once("SIGINT", async () => {
    log.info("exiting…")
    await watcher.close()
    process.exit(0)
  })
}

main().catch((err) => {
  log.err(err.message)
  process.exit(1)
})
