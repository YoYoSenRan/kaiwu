/** 新建表单里可以预填的工作区文件清单。顺序即展示顺序。 */
export const EDITABLE_BOOTSTRAP_FILES = ["SOUL.md", "IDENTITY.md", "USER.md", "HEARTBEAT.md", "TOOLS.md"] as const

export type EditableBootstrapFile = (typeof EDITABLE_BOOTSTRAP_FILES)[number]

/** 标准 bootstrap 文件的完整顺序，workspace Tab 按此顺序优先展示。 */
export const STANDARD_FILE_ORDER = ["SOUL.md", "IDENTITY.md", "USER.md", "HEARTBEAT.md", "TOOLS.md", "AGENTS.md", "BOOTSTRAP.md"] as const

/** 解析业务错误码为 i18n key 后缀，未知的用 unknown。 */
export function errorCodeToKey(message: string): string {
  const known: Record<string, string> = {
    AGENT_ID_EMPTY: "idEmpty",
    AGENT_ID_INVALID: "idInvalid",
    AGENT_ID_RESERVED: "idReserved",
    AGENT_ID_TOO_LONG: "idTooLong",
    AGENT_ID_EXISTS: "idExists",
    WORKSPACE_EXISTS: "workspaceExists",
    AGENT_NOT_FOUND: "notFound",
  }
  return known[message] ?? "unknown"
}
