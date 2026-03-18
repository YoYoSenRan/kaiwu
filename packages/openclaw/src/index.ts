export { getMyStats, getProjectContext, getDebateHistory, getMyTasks, submitOutput, submitDebateSpeech, completeTask, writeLog } from "./tools"
export { default as registerPlugin } from "./plugin"
export { allTools, commonTools, debateTools, buildTools, submitTools } from "./plugin/tool-defs"
export type { ToolDef } from "./plugin/tool-defs"
