import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/PageHeader"
import { Scroll } from "lucide-react"

export const metadata: Metadata = {
  title: "造物志 | 开物局",
  description: "每个想法的一生。成器或封存，都值得一读。",
}

export default function StoriesPage(): React.ReactElement {
  return (
    <>
      <PageHeader title="造 物 志" subtitle="每个想法的一生。成器或封存，都值得一读。" />
      <div className="py-20 flex flex-col items-center text-center">
        <Scroll className="w-16 h-16 text-muted-fg/40 mb-4" />
        <p className="text-base text-foreground">还没有造物志。</p>
        <p className="text-sm text-muted-fg mt-1">等第一件器物问世吧。</p>
      </div>
    </>
  )
}
