import { createGatewayClient, type GatewayClient } from "./client"
import { createGatewayMethods, type GatewayMethods } from "./methods"
import { createChatEventStream, type ChatEventStream } from "./stream"

export interface GatewayConnection {
  client: GatewayClient
  stream: ChatEventStream
  methods: GatewayMethods
  disconnect: () => void
  isConnected: () => boolean
}

/**
 * 创建并启动一个 gateway 连接。
 * @param url WebSocket URL
 * @param auth 认证凭据（token 或 password）
 * @returns GatewayConnection 实例
 * @throws 连接或握手失败时抛错
 */
export async function createGatewayConnection(url: string, auth: { token?: string; password?: string }): Promise<GatewayConnection> {
  const client = createGatewayClient()
  const stream = createChatEventStream(client)
  const methods = createGatewayMethods(client)
  try {
    await client.connect(url, auth)
  } catch (err) {
    stream.dispose()
    client.disconnect()
    throw err
  }
  return {
    client,
    stream,
    methods,
    disconnect: () => {
      stream.dispose()
      client.disconnect()
    },
    isConnected: () => client.isConnected(),
  }
}
