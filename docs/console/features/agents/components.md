# 组件设计 — Agent 管理

## 组件树

```
app/(dashboard)/agents/
├── page.tsx                              Server Component — 列表页
├── queries.ts                            数据查询
├── [id]/
│   └── page.tsx                          Server Component — 详情页
└── components/
    ├── AgentGrid.tsx                      Client — 卡片网格（订阅实时状态）
    ├── AgentCard.tsx                      Client — 单张卡片
    ├── AgentStatusDot.tsx                 Client — 状态指示灯
    ├── AgentOverview.tsx                  Client — 详情概览 Tab
    ├── AgentFiles.tsx                     Client — 文件列表与编辑
    ├── AgentFileEditor.tsx                Client — 单文件 Markdown 编辑器
    ├── AgentTasks.tsx                     Server — 任务列表 Tab
    └── AgentCosts.tsx                     Server — 消耗统计 Tab
```

## 文件结构说明

| 组件               | 类型   | 说明                                          |
| ------------------ | ------ | --------------------------------------------- |
| `page.tsx`（列表） | Server | 查 DB 获取 Agent 列表，传给 AgentGrid         |
| `page.tsx`（详情） | Server | 查 DB 获取单个 Agent，渲染 Tab 容器           |
| `AgentGrid`        | Client | 接收 DB 数据作为 props，订阅 Zustand 实时状态 |
| `AgentCard`        | Client | 展示单个 Agent 卡片，点击跳转详情             |
| `AgentStatusDot`   | Client | 状态灯，订阅 Zustand 获取实时状态             |
| `AgentOverview`    | Client | 概览 Tab，混合 DB 数据 + 实时状态             |
| `AgentFiles`       | Client | 文件列表，按需加载文件内容                    |
| `AgentFileEditor`  | Client | Markdown 编辑器，保存触发 Server Action       |
| `AgentTasks`       | Server | 从 DB 查询该 Agent 的任务列表                 |
| `AgentCosts`       | Server | 从 DB 查询该 Agent 的消耗统计                 |

## 关键 Props Interface

```ts
interface AgentCardProps {
  agent: { id: string; name: string; stageType: string; subRole: string | null; model: string | null; isEnabled: boolean }
}

interface AgentFilesProps {
  agentId: string
}

interface AgentFileEditorProps {
  agentId: string
  filename: string
  label: string
  content: string
}

interface AgentTasksProps {
  tasks: { id: number; title: string; status: string; createdAt: Date }[]
}

interface AgentCostsProps {
  agentId: string
  period: "day" | "week" | "month"
}
```

## Workspace 文件名映射

```ts
const WORKSPACE_FILES: Record<string, { label: string; description: string }> = {
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
```

文件列表只展示 workspace 中实际存在的文件，不展示空文件。
