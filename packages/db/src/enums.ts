export const PROJECT_STATUS = {
  Scouting: "scouting",
  Debating: "debating",
  Planning: "planning",
  Building: "building",
  Inspecting: "inspecting",
  Deploying: "deploying",
  Launched: "launched",
  Dead: "dead",
} as const

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS]

export const PHASE_TYPE = { Scout: "scout", Council: "council", Architect: "architect", Builder: "builder", Inspector: "inspector", Deployer: "deployer" } as const

export type PhaseType = (typeof PHASE_TYPE)[keyof typeof PHASE_TYPE]

export const PHASE_STATUS = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Failed: "failed",
  Stale: "stale",
  Blocked: "blocked",
  Skipped: "skipped",
} as const

export type PhaseStatus = (typeof PHASE_STATUS)[keyof typeof PHASE_STATUS]

export const AGENT_STATUS = { Idle: "idle", Thinking: "thinking", Working: "working", Debating: "debating", Blocked: "blocked", Done: "done", Error: "error" } as const

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS]

export const KEYWORD_STATUS = { Pending: "pending", Queued: "queued", Scouting: "scouting", InPipeline: "in_pipeline", Completed: "completed", Dead: "dead" } as const

export type KeywordStatus = (typeof KEYWORD_STATUS)[keyof typeof KEYWORD_STATUS]

export const TASK_STATUS = { Pending: "pending", InProgress: "in_progress", Completed: "completed", Blocked: "blocked", Cancelled: "cancelled" } as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

export const VOTE_STANCE = { Seal: "seal", Blank: "blank" } as const

export type VoteStance = (typeof VOTE_STANCE)[keyof typeof VOTE_STANCE]

export const LOG_TYPE = { Thought: "thought", Action: "action", Decision: "decision", Error: "error" } as const

export type LogType = (typeof LOG_TYPE)[keyof typeof LOG_TYPE]

export const LOG_VISIBILITY = { Public: "public", Internal: "internal" } as const

export type LogVisibility = (typeof LOG_VISIBILITY)[keyof typeof LOG_VISIBILITY]

export const EVENT_TYPE = {
  // 物帖
  KeywordSubmitted: "keyword_submitted",
  VoteCast: "vote_cast",
  // 采风
  ScoutStarted: "scout_started",
  ScoutReportReady: "scout_report_ready",
  ScoutRejected: "scout_rejected",
  // 过堂
  DebateRoundStart: "debate_round_start",
  DebateSpeech: "debate_speech",
  DebateVerdict: "debate_verdict",
  EpitaphWritten: "epitaph_written",
  // 绘图
  BlueprintCreated: "blueprint_created",
  // 锻造
  TaskAssigned: "task_assigned",
  TaskCompleted: "task_completed",
  CodeCommitted: "code_committed",
  // 试剑
  ReviewIssueFound: "review_issue_found",
  ReviewPassed: "review_passed",
  ReviewFailed: "review_failed",
  // 鸣锣
  DeployStarted: "deploy_started",
  DeployCompleted: "deploy_completed",
  SmokeTestFailed: "smoke_test_failed",
  ProductLaunched: "product_launched",
  // 属性与复盘
  StatUpdated: "stat_updated",
  RetrospectiveCreated: "retrospective_created",
  AchievementUnlocked: "achievement_unlocked",
  // 编排层追溯
  TickExecuted: "tick_executed",
  PhaseTransition: "phase_transition",
  AgentCalled: "agent_called",
  AgentFailed: "agent_failed",
  AgentRetried: "agent_retried",
  BackoffTriggered: "backoff_triggered",
  BackoffRecovered: "backoff_recovered",
  ProjectBlocked: "project_blocked",
  ProjectUnblocked: "project_unblocked",
  GatewayDown: "gateway_down",
  GatewayRecovered: "gateway_recovered",
} as const

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE]
