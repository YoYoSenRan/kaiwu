/**
 * OpenClaw workspace 官方支持的文件名映射
 * 用于在 UI 上展示中文标签和描述
 */
export const WORKSPACE_FILES: Record<string, { label: string; description: string }> = {
  "SOUL.md": { label: "灵魂设定", description: "价值观与行为准则" },
  "IDENTITY.md": { label: "身份信息", description: "名字、语气、emoji" },
  "AGENTS.md": { label: "工作协议", description: "协作流程与任务规范" },
  "USER.md": { label: "用户配置", description: "用户信息与偏好" },
  "TOOLS.md": { label: "工具配置", description: "本地工具与环境" },
  "WORKING.md": { label: "工作记忆", description: "当前任务与进度" },
  "MEMORY.md": { label: "长期记忆", description: "知识与经验" },
  "HEARTBEAT.md": { label: "心跳任务", description: "定期检查事项" },
  "agent.md": { label: "任务概览", description: "Agent 总体描述" },
}

export const STAGE_LABELS: Record<string, string> = { triage: "分拣", planning: "规划", review: "审核", dispatch: "派发", execute: "执行", publish: "发布" }

export const DETAIL_TABS = [
  { key: "overview", label: "概览" },
  { key: "files", label: "文件" },
  { key: "tasks", label: "任务" },
  { key: "costs", label: "消耗" },
] as const

export type DetailTab = (typeof DETAIL_TABS)[number]["key"]
