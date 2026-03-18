#!/usr/bin/env tsx
/**
 * sync-workspaces.ts — 模板 → OpenClaw workspace 同步 + Gateway 配置生成
 *
 * 用法：
 *   pnpm sync:openclaw                          # 同步到默认目录
 *   pnpm sync:openclaw --dry-run                # 仅输出差异，不写文件
 *   pnpm sync:openclaw --workspace-root /path   # 指定 workspace 根目录
 */
import { readdir, readFile, writeFile, mkdir, cp } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

// ---------------------------------------------------------------------------
// 参数解析
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const wsRootIdx = args.indexOf("--workspace-root")
const openclawDir = wsRootIdx !== -1 && args[wsRootIdx + 1]
  ? resolve(args[wsRootIdx + 1]!)
  : resolve(process.env.OPENCLAW_DIR ?? join(process.env.HOME ?? "~", ".openclaw"))

const workspacesDir = join(openclawDir, "workspaces")
const pluginsDir = join(openclawDir, "plugins", "kaiwu-tools")
const gatewayConfigPath = join(openclawDir, "gateway.yaml")

// ---------------------------------------------------------------------------
// 模板源
// ---------------------------------------------------------------------------

const presetsDir = resolve(__dirname, "../packages/templates/src/presets/kaiwu-factory/agents")
const pluginSrcDir = resolve(__dirname, "../packages/openclaw/src/plugin")
const gatewayTemplatePath = resolve(__dirname, "../packages/openclaw/gateway.template.yaml")

// ---------------------------------------------------------------------------
// 同步逻辑
// ---------------------------------------------------------------------------

async function syncAgentWorkspaces(): Promise<void> {
  const agents = await readdir(presetsDir)

  for (const agentId of agents) {
    const srcDir = join(presetsDir, agentId)
    const destDir = join(workspacesDir, agentId)

    const files = ["SOUL.md", "TOOLS.md"]
    for (const file of files) {
      const srcPath = join(srcDir, file)
      if (!existsSync(srcPath)) continue

      const destPath = join(destDir, file)
      const srcContent = await readFile(srcPath, "utf-8")

      if (existsSync(destPath)) {
        const destContent = await readFile(destPath, "utf-8")
        if (srcContent === destContent) {
          console.log(`  [skip] ${agentId}/${file} (unchanged)`)
          continue
        }
      }

      if (dryRun) {
        console.log(`  [diff] ${agentId}/${file} → ${destPath}`)
      } else {
        await mkdir(destDir, { recursive: true })
        await writeFile(destPath, srcContent)
        console.log(`  [sync] ${agentId}/${file} → ${destPath}`)
      }
    }
  }
}

async function syncPlugin(): Promise<void> {
  const files = ["index.ts", "tool-defs.ts", "openclaw.plugin.json"]

  for (const file of files) {
    const srcPath = join(pluginSrcDir, file)
    if (!existsSync(srcPath)) continue

    const destPath = join(pluginsDir, file)
    const srcContent = await readFile(srcPath, "utf-8")

    if (existsSync(destPath)) {
      const destContent = await readFile(destPath, "utf-8")
      if (srcContent === destContent) {
        console.log(`  [skip] plugin/${file} (unchanged)`)
        continue
      }
    }

    if (dryRun) {
      console.log(`  [diff] plugin/${file} → ${destPath}`)
    } else {
      await mkdir(pluginsDir, { recursive: true })
      await writeFile(destPath, srcContent)
      console.log(`  [sync] plugin/${file} → ${destPath}`)
    }
  }
}

async function syncGatewayConfig(): Promise<void> {
  const srcContent = await readFile(gatewayTemplatePath, "utf-8")

  if (existsSync(gatewayConfigPath)) {
    const destContent = await readFile(gatewayConfigPath, "utf-8")
    if (srcContent === destContent) {
      console.log(`  [skip] gateway.yaml (unchanged)`)
      return
    }
  }

  if (dryRun) {
    console.log(`  [diff] gateway.yaml → ${gatewayConfigPath}`)
  } else {
    await writeFile(gatewayConfigPath, srcContent)
    console.log(`  [sync] gateway.yaml → ${gatewayConfigPath}`)
  }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\n开物局 OpenClaw 同步`)
  console.log(`  目标目录: ${openclawDir}`)
  console.log(`  模式: ${dryRun ? "dry-run（仅输出差异）" : "sync（写入文件）"}\n`)

  console.log("1. 同步 Agent workspace...")
  await syncAgentWorkspaces()

  console.log("\n2. 同步 Plugin...")
  await syncPlugin()

  console.log("\n3. 同步 Gateway 配置...")
  await syncGatewayConfig()

  console.log(dryRun ? "\n[dry-run] 以上为预期变更，未写入任何文件。" : "\n同步完成。")
}

main().catch((err) => {
  console.error("同步失败:", err)
  process.exit(1)
})
