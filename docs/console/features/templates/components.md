# 组件设计 — 模板管理

## 文件结构

```
app/(dashboard)/templates/
├── page.tsx                              Server Component，列表页
├── [slug]/
│   └── page.tsx                          Server Component，详情预览页
├── queries.ts                            数据查询
├── actions.ts                            Server Action（部署/重部署）
└── components/
    ├── TemplateCard.tsx                   Server Component，单个模板卡片
    ├── DeployButton.tsx                   Client Component，部署按钮（loading 状态）
    ├── PipelineFlow.tsx                   Server Component，Pipeline 流程图
    ├── AgentTable.tsx                     Server Component，Agent 列表表格
    └── PermissionMatrix.tsx              Server Component，权限矩阵表格
```

## 关键接口

```ts
// TemplateCard
interface TemplateCardProps {
  template: { slug: string; name: string; description: string; version: string; agentCount: number }
  isActive: boolean
}

// DeployButton
interface DeployButtonProps {
  slug: string
  isActive: boolean // true 时显示「重新部署」
  onSuccess?: () => void
}

// PipelineFlow
interface PipelineFlowProps {
  pipelines: Array<{ stageType: string; label: string; emoji: string; color: string; description: string; sortOrder: number }>
}

// AgentTable
interface AgentTableProps {
  agents: Array<{ id: string; stageType: string; subRole: string | null }>
}

// PermissionMatrix
interface PermissionMatrixProps {
  agents: Array<{ id: string }>
  permissions: Record<string, { allowAgents: string[] }>
}
```
