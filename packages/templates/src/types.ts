import { z } from "zod"

/**
 * Pipeline 阶段类型
 * triage: 分拣 | planning: 规划 | review: 审议
 * dispatch: 派发 | execute: 执行 | publish: 发布
 */
const STAGE_TYPES = ["triage", "planning", "review", "dispatch", "execute", "publish"] as const
type StageType = (typeof STAGE_TYPES)[number]

const PipelineDefinitionSchema = z.object({
  stageType: z.enum(STAGE_TYPES),
  sortOrder: z.number().int().positive(),
  label: z.string().min(1),
  emoji: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().min(1),
})

const AgentDefinitionSchema = z.object({ id: z.string().min(1), stageType: z.enum(STAGE_TYPES), subRole: z.string().nullable() })

const PermissionSchema = z.object({ allowAgents: z.array(z.string()) })

const ThemeConfigSchema = z.object({ config: z.record(z.string(), z.unknown()) })

const ManifestSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  theme: ThemeConfigSchema,
  pipelines: z.array(PipelineDefinitionSchema).min(1),
  agents: z.array(AgentDefinitionSchema).min(1),
  permissions: z.record(z.string(), PermissionSchema),
  workProtocol: z.string().min(1),
})

type PipelineDefinition = z.infer<typeof PipelineDefinitionSchema>
type AgentDefinition = z.infer<typeof AgentDefinitionSchema>
type Manifest = z.infer<typeof ManifestSchema>

interface TemplateSummary {
  slug: string
  name: string
  description: string
  version: string
  agentCount: number
}

interface InitOptions {
  /** OpenClaw 数据目录，默认 ~/.openclaw */
  openclawDir?: string
  /** 是否跳过 Gateway 重启 */
  skipRestart?: boolean
}

interface InitResult {
  slug: string
  workspacesCreated: string[]
  agentsRegistered: string[]
  openclawJsonUpdated: boolean
  gatewayRestarted: boolean
}

export { ManifestSchema, STAGE_TYPES }
export type { AgentDefinition, InitOptions, InitResult, Manifest, PipelineDefinition, StageType, TemplateSummary }
