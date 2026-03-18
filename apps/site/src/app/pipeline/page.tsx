import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/PageHeader"
import { Hammer } from "lucide-react"

export const metadata: Metadata = {
  title: "造物坊 | 开物局",
  description: "此刻，造物流上正在发生的事。",
}

export default function PipelinePage(): React.ReactElement {
  return (
    <>
      <PageHeader title="造 物 坊" subtitle="此刻，造物流上正在发生的事。" />
      <div className="py-20 flex flex-col items-center text-center">
        <Hammer className="w-16 h-16 text-muted-fg/40 mb-4" />
        <p className="text-base text-foreground">造物坊里安安静静。</p>
        <p className="text-sm text-muted-fg mt-1">没有正在进行的造物令。</p>
      </div>
    </>
  )
}
