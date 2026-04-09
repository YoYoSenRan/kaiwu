/**
 * 多阶段任务编排器。
 *
 * 驱动一个多阶段 agent 任务的完整生命周期：
 * 1. 创建 session
 * 2. 对每个阶段：推知识库（invokePlugin stage.set）→ 发消息（chat.send）→ 等完成
 * 3. 全部完成后清理知识库（stage.clear）
 *
 * 编排器运行在主进程，因为需要：
 * - 访问本地数据（知识库检索结果）
 * - 协调多个 session
 * - 直接推 renderer 更新 UI
 */

import log from "../../../core/logger"
import type { GatewayMethods } from "../gateway/methods"
import type { ChatEventStream } from "../gateway/stream"
import type { InvokeArgs, InvokeResult } from "../types"
import { registerSession, updateSessionStatus } from "../session/manager"
import type { StartTaskParams, TaskState } from "./contract"

type InvokePluginFn = (args: InvokeArgs) => Promise<InvokeResult>
type TaskChangeListener = (state: TaskState) => void

const tasks = new Map<string, TaskState>()
const listeners = new Set<TaskChangeListener>()
let taskCounter = 0

function notifyChange(state: TaskState): void {
  for (const fn of listeners) fn(state)
}

/**
 * 启动一个多阶段任务。
 * @param params 任务参数
 * @param deps 依赖注入：gateway RPC + 插件调用 + 事件流
 */
export async function startTask(params: StartTaskParams, deps: { rpc: GatewayMethods; invoke: InvokePluginFn; stream: ChatEventStream }): Promise<TaskState> {
  const taskId = `task-${++taskCounter}-${Date.now().toString(36)}`

  // 1. 创建 session
  const sessionKey = `agent:${params.agentId}:kaiwu:${taskId}`
  const result = (await deps.rpc.sessionCreate({ key: sessionKey, agentId: params.agentId, label: params.label })) as { key?: string }
  const resolvedKey = result?.key ?? sessionKey

  registerSession(resolvedKey, { agentId: params.agentId, label: params.label })
  updateSessionStatus(resolvedKey, "active")

  const state: TaskState = {
    taskId,
    sessionKey: resolvedKey,
    stages: params.stages,
    currentStage: 0,
    status: "running",
    startedAt: Date.now(),
  }
  tasks.set(taskId, state)
  notifyChange(state)

  // 2. 逐阶段执行（异步，不阻塞调用方）
  void runStages(state, deps).catch((err) => {
    failTask(state, (err as Error).message)
  })

  return state
}

/** 逐阶段执行。 */
async function runStages(state: TaskState, deps: { rpc: GatewayMethods; invoke: InvokePluginFn; stream: ChatEventStream }): Promise<void> {
  for (const stage of state.stages) {
    if (state.status !== "running") return
    state.currentStage = stage.index
    notifyChange(state)

    // 推知识库到插件
    await deps.invoke({ action: "stage.set", params: { sessionKey: state.sessionKey, instruction: stage.instruction, knowledge: stage.knowledge } })

    // 发消息
    await deps.rpc.chatSend({ sessionKey: state.sessionKey, message: stage.message })

    // 等 agent 完成（监听 final/error/aborted）
    await waitForCompletion(state.sessionKey, deps.stream)

    log.info(`[orchestrator] stage ${stage.index}/${state.stages.length} done: ${stage.name}`)
  }

  // 清理知识库
  await deps.invoke({ action: "stage.clear", params: { sessionKey: state.sessionKey } })

  state.status = "completed"
  notifyChange(state)
  log.info(`[orchestrator] task ${state.taskId} completed`)
}

/** 等待指定 session 的当前 run 完成。 */
function waitForCompletion(sessionKey: string, stream: ChatEventStream): Promise<void> {
  return new Promise((resolve, reject) => {
    const unsub = stream.subscribe(sessionKey, (event) => {
      if (event.state === "final") {
        unsub()
        resolve()
      } else if (event.state === "error") {
        unsub()
        reject(new Error(event.errorMessage ?? "agent error"))
      } else if (event.state === "aborted") {
        unsub()
        reject(new Error("agent aborted"))
      }
    })
  })
}

function failTask(state: TaskState, error: string): void {
  state.status = "failed"
  state.error = error
  notifyChange(state)
  log.error(`[orchestrator] task ${state.taskId} failed: ${error}`)
}

/** 中止任务。 */
export async function abortTask(taskId: string, rpc: GatewayMethods): Promise<void> {
  const state = tasks.get(taskId)
  if (!state || state.status !== "running") return
  state.status = "aborted"
  notifyChange(state)
  await rpc.chatAbort({ sessionKey: state.sessionKey }).catch(() => {})
}

/** 获取任务状态。 */
export function getTask(taskId: string): TaskState | undefined {
  return tasks.get(taskId)
}

/** 获取所有任务（快照）。 */
export function listTasks(): TaskState[] {
  return [...tasks.values()]
}

/**
 * 订阅任务状态变更，返回取消函数。
 * @param listener 变更回调
 */
export function onTaskChange(listener: TaskChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
