import type {
  AgentFilesGetParams,
  AgentFilesGetResult,
  AgentFilesListParams,
  AgentFilesListResult,
  AgentFilesSetParams,
  AgentFilesSetResult,
  AgentIdentityGetParams,
  AgentIdentityGetResult,
  AgentsCreateParams,
  AgentsCreateResult,
  AgentsDeleteParams,
  AgentsDeleteResult,
  AgentsListResult,
  AgentsUpdateParams,
  AgentsUpdateResult,
  SkillsStatusParams,
  SkillsStatusResult,
  ToolsCatalogParams,
  ToolsCatalogResult,
  ToolsEffectiveParams,
  ToolsEffectiveResult,
} from "../contracts/rpc"
import { domain } from "../kernel/registry"

/** agents.* 及相关 identity/files/skills/tools RPC 转发。 */
export const agents = domain({
  namespace: "openclaw.agents",
  methods: {
    list: (gw) => gw.call<AgentsListResult>("agents.list"),
    create: (gw, params: AgentsCreateParams) => gw.call<AgentsCreateResult>("agents.create", params),
    update: (gw, params: AgentsUpdateParams) => gw.call<AgentsUpdateResult>("agents.update", params),
    delete: (gw, params: AgentsDeleteParams) => gw.call<AgentsDeleteResult>("agents.delete", params),
    identity: (gw, params: AgentIdentityGetParams) => gw.call<AgentIdentityGetResult>("agent.identity.get", params),
    filesList: (gw, params: AgentFilesListParams) => gw.call<AgentFilesListResult>("agents.files.list", params),
    filesGet: (gw, params: AgentFilesGetParams) => gw.call<AgentFilesGetResult>("agents.files.get", params),
    filesSet: (gw, params: AgentFilesSetParams) => gw.call<AgentFilesSetResult>("agents.files.set", params),
    skillsStatus: (gw, params: SkillsStatusParams) => gw.call<SkillsStatusResult>("skills.status", params),
    toolsCatalog: (gw, params: ToolsCatalogParams) => gw.call<ToolsCatalogResult>("tools.catalog", params),
    toolsEffective: (gw, params: ToolsEffectiveParams) => gw.call<ToolsEffectiveResult>("tools.effective", params),
  },
})
