/**
 * Agent 异步分发——通过 gateway-client 创建 cron one-shot job，不同步等待
 */
import { dispatchAgentTask } from "@kaiwu/openclaw/gateway-client"
import { emitEvent } from "../events/emitter"

interface CallAgentOptions {
  agentId: string
  message: string
  projectId?: string
  phaseId?: string
  timeoutSeconds?: number
}

interface CallAgentResult {
  dispatched: boolean
  jobId: string
}

/** 分发任务给 Agent（异步，不等结果） */
export async function callAgent(opts: CallAgentOptions): Promise<CallAgentResult> {
  const { jobId } = await dispatchAgentTask(opts.agentId, opts.message, { timeoutSeconds: opts.timeoutSeconds })

  await emitEvent({
    type: "agent_dispatched",
    title: `任务已分发给 ${opts.agentId}`,
    detail: { jobId, agentId: opts.agentId, message: opts.message },
    projectId: opts.projectId,
    phaseId: opts.phaseId,
    agentId: opts.agentId,
  })

  return { dispatched: true, jobId }
}
