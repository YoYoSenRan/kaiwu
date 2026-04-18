import { createBridge } from "../../app/bridge"
import type { AgentBridge } from "./contracts"

const bridge = createBridge("agent")

export const agent: AgentBridge = {
  list: () => bridge.invoke("list"),
  detail: (agentId) => bridge.invoke("detail", agentId),
  create: (input) => bridge.invoke("create", input),
  update: (input) => bridge.invoke("update", input),
  delete: (input) => bridge.invoke("delete", input),
  importUnsynced: (input) => bridge.invoke("importUnsynced", input),
  filesGet: (input) => bridge.invoke("filesGet", input),
  filesSet: (input) => bridge.invoke("filesSet", input),
}
