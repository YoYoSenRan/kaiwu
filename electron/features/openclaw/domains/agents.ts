import type { AgentsCreateParams, AgentsCreateResult, AgentsDeleteParams, AgentsDeleteResult, AgentsListResult, AgentsUpdateParams, AgentsUpdateResult } from "../contracts/rpc"
import { domain } from "../kernel/registry"

/** agents.* RPC 转发。 */
export const agents = domain({
  namespace: "openclaw.agents",
  methods: {
    list: (gw) => gw.call<AgentsListResult>("agents.list"),
    create: (gw, params: AgentsCreateParams) => gw.call<AgentsCreateResult>("agents.create", params),
    update: (gw, params: AgentsUpdateParams) => gw.call<AgentsUpdateResult>("agents.update", params),
    delete: (gw, params: AgentsDeleteParams) => gw.call<AgentsDeleteResult>("agents.delete", params),
  },
})
