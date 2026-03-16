interface TaskItem {
  id: number
  title: string
  status: string
  createdAt: Date
}

interface AgentTasksProps {
  tasks: TaskItem[]
}

const STATUS_LABELS: Record<string, string> = { pending: "待处理", in_progress: "进行中", review: "审查中", done: "已完成", cancelled: "已取消" }

export function AgentTasks({ tasks }: AgentTasksProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">该 Agent 暂无任务记录</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="p-3 font-medium">ID</th>
            <th className="p-3 font-medium">标题</th>
            <th className="p-3 font-medium">状态</th>
            <th className="hidden p-3 font-medium md:table-cell">时间</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-border last:border-0">
              <td className="p-3 text-muted-foreground">#{task.id}</td>
              <td className="p-3">{task.title}</td>
              <td className="p-3">
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs">{STATUS_LABELS[task.status] ?? task.status}</span>
              </td>
              <td className="hidden p-3 text-muted-foreground md:table-cell">{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(task.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
