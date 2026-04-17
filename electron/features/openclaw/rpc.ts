/**
 * openclaw 四个纯 RPC 域(chat / sessions / agents / models)的合并 Controller。
 *
 * 这几个域都是"类型化 gateway.call 转发",没有本地决策。
 * 合并到一个文件省 4 套样板,加新方法时只在一处改。
 */

import type {
  AgentsCreateParams,
  AgentsCreateResult,
  AgentsDeleteParams,
  AgentsDeleteResult,
  AgentsListResult,
  AgentsUpdateParams,
  AgentsUpdateResult,
} from "./agents/contract"
import type { ChatAbortParams, ChatHistoryMessage, ChatHistoryParams, ChatSendParams } from "./chat/contract"
import type { ModelsListResult } from "./models/contract"
import type { SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams } from "./sessions/contract"
import { Controller, Handle, IpcController } from "../../framework"
import { getGateway } from "./container"

/** chat.* RPC 转发。流式 chunk 走 gateway event 帧推送,不在 response 里返回。 */
@Controller("openclaw.chat")
export class ChatService extends IpcController {
  @Handle("send")
  send(params: ChatSendParams): Promise<unknown> {
    return getGateway().call("chat.send", params)
  }

  @Handle("abort")
  abort(params: ChatAbortParams): Promise<unknown> {
    return getGateway().call("chat.abort", params)
  }

  @Handle("history")
  history(params: ChatHistoryParams): Promise<ChatHistoryMessage[]> {
    return getGateway().call<ChatHistoryMessage[]>("chat.history", params)
  }
}

/** sessions.* RPC 转发。 */
@Controller("openclaw.sessions")
export class SessionsService extends IpcController {
  @Handle("create")
  create(params: SessionCreateParams): Promise<unknown> {
    return getGateway().call("sessions.create", params)
  }

  @Handle("list")
  list(params?: SessionListParams): Promise<unknown> {
    return getGateway().call("sessions.list", params)
  }

  @Handle("patch")
  patch(params: SessionPatchParams): Promise<unknown> {
    return getGateway().call("sessions.patch", params)
  }

  @Handle("delete")
  remove(params: SessionDeleteParams): Promise<unknown> {
    return getGateway().call("sessions.delete", params)
  }
}

/** agents.* RPC 转发。 */
@Controller("openclaw.agents")
export class AgentsService extends IpcController {
  @Handle("list")
  list(): Promise<AgentsListResult> {
    return getGateway().call<AgentsListResult>("agents.list")
  }

  @Handle("create")
  create(params: AgentsCreateParams): Promise<AgentsCreateResult> {
    return getGateway().call<AgentsCreateResult>("agents.create", params)
  }

  @Handle("update")
  update(params: AgentsUpdateParams): Promise<AgentsUpdateResult> {
    return getGateway().call<AgentsUpdateResult>("agents.update", params)
  }

  @Handle("delete")
  remove(params: AgentsDeleteParams): Promise<AgentsDeleteResult> {
    return getGateway().call<AgentsDeleteResult>("agents.delete", params)
  }
}

/** models.* RPC 转发。 */
@Controller("openclaw.models")
export class ModelsService extends IpcController {
  @Handle("list")
  list(): Promise<ModelsListResult> {
    return getGateway().call<ModelsListResult>("models.list")
  }
}
