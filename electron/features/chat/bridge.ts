import { ipcRenderer } from "electron"
import { chatChannels } from "./channels"
import type { ChatBridge, ChatCreateInput, ChatInvocationRow, ChatMemberAddInput, ChatRoundtableEvent, ChatSendInput, ChatStreamEvent, ChatToolEvent } from "./types"

/** 订阅一个 ipcRenderer 事件，返回取消订阅函数。 */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: unknown, payload: T) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

/** Chat 模块暴露给渲染进程的 preload bridge。 */
export const chatBridge: ChatBridge = {
  /** 获取聊天列表。 */
  list: () => ipcRenderer.invoke(chatChannels.list),
  /** 同步指定聊天的消息。 */
  sync: (chatId: string) => ipcRenderer.invoke(chatChannels.sync, chatId),
  /** 创建新聊天。 */
  create: (input: ChatCreateInput) => ipcRenderer.invoke(chatChannels.create, input),
  /** 删除聊天。 */
  delete: (id: string) => ipcRenderer.invoke(chatChannels.delete, id),
  /** 获取聊天详情。 */
  detail: (id: string) => ipcRenderer.invoke(chatChannels.detail, id),
  /** 更新聊天配置。 */
  updateConfig: (id: string, config: Record<string, unknown>) => ipcRenderer.invoke(chatChannels.config, id, config),

  /** 消息相关操作。 */
  messages: {
    /** 获取聊天消息列表。 */
    list: (chatId: string) => ipcRenderer.invoke(chatChannels.messages.list, chatId),
    /** 发送消息。 */
    send: (input: ChatSendInput) => ipcRenderer.invoke(chatChannels.messages.send, input),
  },

  /** 成员相关操作。 */
  members: {
    /** 获取聊天成员列表。 */
    list: (chatId: string) => ipcRenderer.invoke(chatChannels.members.list, chatId),
    /** 添加成员。 */
    add: (input: ChatMemberAddInput) => ipcRenderer.invoke(chatChannels.members.add, input),
    /** 移除成员。 */
    remove: (chatId: string, agentId: string) => ipcRenderer.invoke(chatChannels.members.remove, chatId, agentId),
  },

  /** 调用记录相关操作。 */
  invocations: {
    /** 获取聊天内的工具调用记录列表。 */
    list: (chatId: string) => ipcRenderer.invoke(chatChannels.invocations.list, chatId) as Promise<ChatInvocationRow[]>,
  },

  /** 圆桌会议相关操作。 */
  roundtable: {
    /** 停止圆桌会议。 */
    stop: (chatId: string) => ipcRenderer.invoke(chatChannels.roundtable.stop, chatId),
    /** 启动圆桌会议。 */
    start: (chatId: string, topic: string) => ipcRenderer.invoke(chatChannels.roundtable.start, chatId, topic),
    /** 暂停圆桌会议。 */
    pause: (chatId: string) => ipcRenderer.invoke(chatChannels.roundtable.pause, chatId),
    /** 恢复圆桌会议。 */
    resume: (chatId: string) => ipcRenderer.invoke(chatChannels.roundtable.resume, chatId),
  },

  /** 中止指定聊天的流式响应。 */
  abort: (chatId: string) => ipcRenderer.invoke(chatChannels.abort, chatId),

  /** 事件订阅。 */
  on: {
    /** 订阅工具调用事件。 */
    tool: (listener) => subscribe<ChatToolEvent>(chatChannels.event.tool, listener),
    /** 订阅流式消息事件。 */
    stream: (listener) => subscribe<ChatStreamEvent>(chatChannels.event.stream, listener),
    /** 订阅圆桌会议事件。 */
    roundtable: (listener) => subscribe<ChatRoundtableEvent>(chatChannels.event.roundtable, listener),
  },
}
