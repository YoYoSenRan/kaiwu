interface AgentCostsProps {
  agentId: string
  period: "day" | "week" | "month"
}

export function AgentCosts({ agentId: _agentId, period }: AgentCostsProps) {
  const periodLabels = { day: "日", week: "周", month: "月" }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Token 消耗</h3>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {(["day", "week", "month"] as const).map((p) => (
            <a
              key={p}
              href={`?tab=costs&period=${p}`}
              className={`rounded px-2 py-1 text-xs ${period === p ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {periodLabels[p]}
            </a>
          ))}
        </div>
      </div>

      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">暂无消耗数据</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="总 Token" value="—" />
        <StatCard label="Input" value="—" />
        <StatCard label="Output" value="—" />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </div>
  )
}
