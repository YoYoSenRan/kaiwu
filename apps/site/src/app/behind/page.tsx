import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/PageHeader"
import { KeyRound } from "lucide-react"

export const metadata: Metadata = { title: "内坊 | 开物局", description: "平时不让看的地方，现在让你看看。" }

export default function BehindPage(): React.ReactElement {
  return (
    <>
      <PageHeader title="内 坊" subtitle="平时不让看的地方，现在让你看看。" />
      <div className="py-20 flex flex-col items-center text-center">
        <KeyRound className="w-16 h-16 text-muted-fg/40 mb-4" />
        <p className="text-base text-foreground">内坊暂不开放。</p>
      </div>
    </>
  )
}
