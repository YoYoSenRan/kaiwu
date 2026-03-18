/**
 * 开物局自建工具定义 — 通过 api.registerTool() 注册到 OpenClaw Gateway
 *
 * 工具名 snake_case（OpenClaw 惯例），底层调用 packages/openclaw/src/tools/ 中的 HTTP client 函数。
 */
import { Type, type TObject } from "@sinclair/typebox"
import { getMyStats } from "../tools/getMyStats"
import { getProjectContext } from "../tools/getProjectContext"
import { getDebateHistory } from "../tools/getDebateHistory"
import { getMyTasks } from "../tools/getMyTasks"
import { submitOutput } from "../tools/submitOutput"
import { submitDebateSpeech } from "../tools/submitDebateSpeech"
import { completeTask } from "../tools/completeTask"
import { writeLog } from "../tools/writeLog"

/** 工具执行结果的标准格式 */
function textResult(data: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }
}

/** 从 Gateway session context 中提取 agentId */
function agentIdFrom(id: string): string {
  return id
}

// ---------------------------------------------------------------------------
// Schema 定义
// ---------------------------------------------------------------------------

const agentIdParam = Type.String({ description: "当前 Agent ID" })
const projectIdParam = Type.String({ description: "项目 ID" })
const phaseIdParam = Type.String({ description: "阶段 ID" })

// ---------------------------------------------------------------------------
// 工具定义
// ---------------------------------------------------------------------------

export interface ToolDef {
  name: string
  description: string
  parameters: TObject
  execute: (id: string, params: Record<string, unknown>) => Promise<{ content: { type: "text"; text: string }[] }>
  optional?: boolean
}

/** 通用工具：所有 Agent 共享 */
export const commonTools: ToolDef[] = [
  {
    name: "get_my_stats",
    description: "读取我的属性面板（各维度数值和评价）",
    parameters: Type.Object({ agentId: agentIdParam }),
    async execute(id, params) {
      const result = await getMyStats(params.agentId as string)
      return textResult(result)
    },
  },
  {
    name: "get_project_context",
    description: "读取当前项目上下文（物帖详情、上游产出、当前阶段）",
    parameters: Type.Object({ projectId: projectIdParam }),
    async execute(id, params) {
      const result = await getProjectContext(params.projectId as string)
      return textResult(result)
    },
  },
  {
    name: "write_log",
    description: "记录思考过程、关键决策或错误信息",
    parameters: Type.Object({
      agentId: agentIdParam,
      projectId: projectIdParam,
      phaseId: Type.Optional(Type.String({ description: "阶段 ID（可选）" })),
      type: Type.Union([Type.Literal("thought"), Type.Literal("action"), Type.Literal("decision"), Type.Literal("error")], { description: "日志类型" }),
      content: Type.String({ description: "日志内容" }),
      visibility: Type.Optional(Type.Union([Type.Literal("public"), Type.Literal("internal")], { description: "可见性，默认 internal" })),
    }),
    async execute(id, params) {
      const agentId = params.agentId as string
      const result = await writeLog(agentId, {
        projectId: params.projectId as string,
        phaseId: params.phaseId as string | undefined,
        type: params.type as "thought" | "action" | "decision" | "error",
        content: params.content as string,
        visibility: params.visibility as "public" | "internal" | undefined,
      })
      return textResult(result)
    },
  },
]

/** 辩论相关工具：说客/诤臣/掌秤 */
export const debateTools: ToolDef[] = [
  {
    name: "get_debate_history",
    description: "读取当前过堂的辩论记录（按轮次排序）",
    parameters: Type.Object({ phaseId: phaseIdParam }),
    async execute(id, params) {
      const result = await getDebateHistory(params.phaseId as string)
      return textResult(result)
    },
  },
  {
    name: "submit_debate_speech",
    description: "提交过堂发言",
    parameters: Type.Object({
      phaseId: phaseIdParam,
      round: Type.Integer({ minimum: 1, maximum: 4, description: "轮次（1-4）" }),
      stance: Type.Union([Type.Literal("support"), Type.Literal("oppose")], { description: "立场" }),
      content: Type.String({ description: "发言正文（Markdown）" }),
      citations: Type.Array(
        Type.Object({
          source: Type.String({ description: "来源" }),
          data: Type.String({ description: "引用的具体数据" }),
          url: Type.Optional(Type.String({ description: "来源 URL" })),
        }),
        { description: "引用列表" }
      ),
      keyPoint: Type.String({ description: "本轮核心论点（一句话）" }),
    }),
    async execute(id, params) {
      const agentId = agentIdFrom(id)
      const result = await submitDebateSpeech(
        params.phaseId as string,
        {
          round: params.round as number,
          stance: params.stance as "support" | "oppose",
          content: params.content as string,
          citations: params.citations as { source: string; data: string; url?: string }[],
          keyPoint: params.keyPoint as string,
        },
        agentId
      )
      return textResult(result)
    },
  },
]

/** 匠人专属工具 */
export const buildTools: ToolDef[] = [
  {
    name: "get_my_tasks",
    description: "获取分配给我的待办任务列表",
    parameters: Type.Object({ projectId: projectIdParam, agentId: agentIdParam }),
    async execute(id, params) {
      const result = await getMyTasks(params.projectId as string, params.agentId as string)
      return textResult(result)
    },
  },
  {
    name: "complete_task",
    description: "提交任务完成报告",
    parameters: Type.Object({
      taskId: Type.String({ description: "任务 ID" }),
      commits: Type.Optional(Type.Array(Type.String(), { description: "提交的 commit 列表" })),
      decisions: Type.Optional(Type.Array(Type.String(), { description: "关键决策及理由" })),
      note: Type.Optional(Type.String({ description: "一句话备注" })),
    }),
    async execute(id, params) {
      const agentId = agentIdFrom(id)
      const result = await completeTask(
        params.taskId as string,
        { commits: params.commits as string[] | undefined, decisions: params.decisions as string[] | undefined, note: params.note as string | undefined },
        agentId
      )
      return textResult(result)
    },
  },
]

/** 按角色具名注册的 submit 工具 — 底层都调 POST /phases/:id/output */
export const submitTools: ToolDef[] = [
  {
    name: "submit_scout_report",
    description: "提交采风报告",
    parameters: Type.Object({
      phaseId: phaseIdParam,
      keyword: Type.String(),
      reason: Type.String(),
      background: Type.Object({
        positioning: Type.String(),
        targetUser: Type.String(),
        corePainPoint: Type.String(),
        productForm: Type.String(),
        coreFeatures: Type.Array(Type.String()),
        differentiation: Type.String(),
      }),
      dimensions: Type.Object({
        market: Type.Object({
          score: Type.Number({ minimum: 0, maximum: 100 }),
          summary: Type.String(),
          data: Type.Object({ marketSize: Type.String(), trend: Type.String(), competitors: Type.Array(Type.String()) }),
        }),
        userNeed: Type.Object({
          score: Type.Number({ minimum: 0, maximum: 100 }),
          summary: Type.String(),
          data: Type.Object({ painPointValidation: Type.String(), frequency: Type.String(), willingness: Type.String() }),
        }),
        differentiation: Type.Object({
          score: Type.Number({ minimum: 0, maximum: 100 }),
          summary: Type.String(),
          data: Type.Object({ competitorWeaknesses: Type.Array(Type.String()), entryAngle: Type.String() }),
        }),
        showcasePotential: Type.Object({
          score: Type.Number({ minimum: 0, maximum: 100 }),
          summary: Type.String(),
          data: Type.Object({ visualStyle: Type.String(), interactionIdea: Type.String(), references: Type.Array(Type.String()) }),
        }),
      }),
      overallScore: Type.Number({ minimum: 0, maximum: 100 }),
      verdict: Type.Union([Type.Literal("green"), Type.Literal("yellow"), Type.Literal("red")]),
      privateNote: Type.Optional(Type.String()),
    }),
    async execute(id, params) {
      const agentId = agentIdFrom(id)
      const { phaseId, ...report } = params
      const result = await submitOutput(phaseId as string, report, agentId)
      return textResult(result)
    },
  },
  {
    name: "submit_verdict",
    description: "提交裁决书",
    parameters: Type.Object({
      phaseId: phaseIdParam,
      verdict: Type.Union([Type.Literal("approved"), Type.Literal("rejected"), Type.Literal("conditional")]),
      reason: Type.String(),
      optimistPoints: Type.Array(Type.String()),
      skepticPoints: Type.Array(Type.String()),
      conditions: Type.Optional(Type.Array(Type.String())),
      epitaph: Type.Optional(Type.String()),
    }),
    async execute(id, params) {
      const agentId = agentIdFrom(id)
      const { phaseId, ...verdictData } = params
      const result = await submitOutput(phaseId as string, verdictData, agentId)
      return textResult(result)
    },
  },
  {
    name: "submit_blueprint",
    description: "提交造物蓝图",
    parameters: Type.Object({
      phaseId: phaseIdParam,
      positioning: Type.Object({ oneLiner: Type.String(), sellingPoints: Type.Array(Type.String()), targetAudience: Type.String() }),
      pageStructure: Type.Array(
        Type.Object({ section: Type.String(), title: Type.String(), content: Type.String(), layout: Type.String(), visual: Type.String(), interaction: Type.String() })
      ),
      visualDirection: Type.Object({
        primaryColor: Type.String(),
        secondaryColor: Type.String(),
        backgroundColor: Type.String(),
        fontHeading: Type.String(),
        fontBody: Type.String(),
        styleKeywords: Type.Array(Type.String()),
        references: Type.Array(Type.String()),
      }),
      signature: Type.String(),
      tasks: Type.Array(
        Type.Object({
          id: Type.String(),
          section: Type.String(),
          title: Type.String(),
          structure: Type.String(),
          content: Type.String(),
          visual: Type.String(),
          interaction: Type.String(),
          assignTo: Type.String(),
          dependsOn: Type.Array(Type.String()),
          priority: Type.Integer(),
        })
      ),
    }),
    async execute(id, params) {
      const agentId = agentIdFrom(id)
      const { phaseId, ...blueprint } = params
      const result = await submitOutput(phaseId as string, blueprint, agentId)
      return textResult(result)
    },
  },
  {
    name: "submit_review",
    description: "提交试剑报告",
    parameters: Type.Object({
      phaseId: phaseIdParam,
      verdict: Type.Union([Type.Literal("pass"), Type.Literal("fail")]),
      issues: Type.Array(
        Type.Object({
          severity: Type.Union([Type.Literal("critical"), Type.Literal("warning"), Type.Literal("info")]),
          category: Type.Union([Type.Literal("code"), Type.Literal("security"), Type.Literal("performance"), Type.Literal("function"), Type.Literal("ux")]),
          description: Type.String(),
          location: Type.String(),
          suggestion: Type.String(),
        })
      ),
      summary: Type.Object({ critical: Type.Integer({ minimum: 0 }), warning: Type.Integer({ minimum: 0 }), info: Type.Integer({ minimum: 0 }) }),
    }),
    async execute(id, params) {
      const agentId = agentIdFrom(id)
      const { phaseId, ...review } = params
      const result = await submitOutput(phaseId as string, review, agentId)
      return textResult(result)
    },
  },
  {
    name: "submit_deploy_report",
    description: "提交鸣锣报告",
    parameters: Type.Object({
      phaseId: phaseIdParam,
      verdict: Type.Union([Type.Literal("launched"), Type.Literal("rollback")]),
      productUrl: Type.String(),
      repoUrl: Type.String(),
      deployInfo: Type.Object({ platform: Type.String(), buildTime: Type.String(), deployId: Type.String() }),
      smokeTest: Type.Object({ passed: Type.Boolean(), checks: Type.Array(Type.Object({ url: Type.String(), status: Type.Integer(), responseTime: Type.String() })) }),
      monitoring: Type.Object({ uptimeUrl: Type.String(), errorTrackingUrl: Type.String() }),
      rollbackPlan: Type.String(),
    }),
    async execute(id, params) {
      const agentId = agentIdFrom(id)
      const { phaseId, ...report } = params
      const result = await submitOutput(phaseId as string, report, agentId)
      return textResult(result)
    },
  },
]

/** 所有工具定义的汇总 */
export const allTools: ToolDef[] = [...commonTools, ...debateTools, ...buildTools, ...submitTools]
