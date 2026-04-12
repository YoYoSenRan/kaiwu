import type { PluginEvent } from "../types"
import type { WebSocket } from "ws"

import { WebSocketServer } from "ws"
import log from "../../../core/logger"
import { extractTokenFromUrl, generateBridgeToken, verifyToken } from "./security"

/** WS 路径：插件和 kaiwu 两端约定一致。 */
const WS_PATH = "/kaiwu"

export interface PluginServerInfo {
  port: number
  token: string
  pid: number
}

export interface PluginServer {
  info: PluginServerInfo
  onEvent: (listener: (event: PluginEvent) => void) => () => void
  /** 主动向插件发送消息（预留能力，当前 WS 以插件 → kaiwu 方向为主）。 */
  sendToPlugin: (payload: unknown) => boolean
  close: () => Promise<void>
}

/**
 * 启动本地 WebSocket 服务端，供 kaiwu 插件连接。
 * 在 127.0.0.1 上监听随机端口，写入 handshake 文件由插件读取。
 * 鉴权/token 逻辑下沉到 security.ts，本层只负责 transport。
 */
export async function startPluginServer(): Promise<PluginServer> {
  const token = generateBridgeToken()
  const wss = new WebSocketServer({ host: "127.0.0.1", port: 0, path: WS_PATH })

  await new Promise<void>((resolve, reject) => {
    wss.once("listening", resolve)
    wss.once("error", reject)
  })

  const address = wss.address()
  if (typeof address !== "object" || address === null) {
    throw new Error("bridge server: unexpected address shape")
  }
  const port = address.port

  const listeners = new Set<(event: PluginEvent) => void>()
  let pluginSocket: WebSocket | null = null

  wss.on("connection", (socket, req) => {
    const provided = extractTokenFromUrl(req.url ?? "")
    if (!verifyToken(provided, token)) {
      log.warn("[openclaw channel] rejected connection: invalid token")
      socket.close(1008, "invalid token")
      return
    }

    log.info("[openclaw channel] plugin connected")
    pluginSocket = socket

    socket.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString("utf-8")) as PluginEvent
        if (typeof parsed?.type !== "string") return
        for (const fn of listeners) fn(parsed)
      } catch (err) {
        log.warn(`[openclaw channel] invalid message: ${(err as Error).message}`)
      }
    })

    socket.once("close", (code) => {
      log.info(`[openclaw channel] plugin disconnected code=${code}`)
      if (pluginSocket === socket) pluginSocket = null
    })

    socket.on("error", (err) => {
      log.warn(`[openclaw channel] ws error: ${err.message}`)
    })
  })

  wss.on("error", (err) => {
    log.error(`[openclaw channel] server error: ${err.message}`)
  })

  return {
    info: { port, token, pid: process.pid },
    onEvent(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    sendToPlugin(payload) {
      if (!pluginSocket || pluginSocket.readyState !== pluginSocket.OPEN) return false
      try {
        pluginSocket.send(JSON.stringify(payload))
        return true
      } catch (err) {
        log.warn(`[openclaw channel] send failed: ${(err as Error).message}`)
        return false
      }
    },
    async close() {
      await new Promise<void>((resolve) => {
        wss.close(() => resolve())
      })
      listeners.clear()
    },
  }
}
