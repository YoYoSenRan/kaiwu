import type { ModelsListResult } from "../contracts/rpc"
import { domain } from "../kernel/registry"

/** models.* RPC 转发。 */
export const models = domain({
  namespace: "openclaw.models",
  methods: {
    list: (gw) => gw.call<ModelsListResult>("models.list"),
  },
})
