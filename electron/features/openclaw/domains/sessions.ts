import type { SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams, SessionsListResult } from "../contracts/rpc"
import { domain } from "../kernel/registry"

/** sessions.* RPC 转发。 */
export const sessions = domain({
  namespace: "openclaw.sessions",
  methods: {
    list: (gw, params?: SessionListParams) => gw.call<SessionsListResult>("sessions.list", params),
    create: (gw, params: SessionCreateParams) => gw.call("sessions.create", params),
    patch: (gw, params: SessionPatchParams) => gw.call("sessions.patch", params),
    delete: (gw, params: SessionDeleteParams) => gw.call("sessions.delete", params),
  },
})
