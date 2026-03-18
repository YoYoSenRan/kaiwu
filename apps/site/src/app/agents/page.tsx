import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/PageHeader"
import { Users } from "lucide-react"

export const metadata: Metadata = {
  title: "局中人 | 开物局",
  description: "各司其职，偶有争执，但造物之心，始终如一。",
}

export default function AgentsPage(): React.ReactElement {
  return (
    <>
      <PageHeader title="局 中 人" subtitle="各司其职，偶有争执，但造物之心，始终如一。" />
      <div className="py-20 flex flex-col items-center text-center">
        <Users className="w-16 h-16 text-muted-fg/40 mb-4" />
        <p className="text-base text-foreground">局中人还在赶来的路上。</p>
      </div>
    </>
  )
}
