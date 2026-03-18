import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/PageHeader"
import { Newspaper } from "lucide-react"

export const metadata: Metadata = {
  title: "物帖墙 | 开物局",
  description: "说一个词，看它的命运。",
}

export default function TrendsPage(): React.ReactElement {
  return (
    <>
      <PageHeader title="物 帖 墙" subtitle="说一个词，看它的命运。" />
      <div className="py-20 flex flex-col items-center text-center">
        <Newspaper className="w-16 h-16 text-muted-fg/40 mb-4" />
        <p className="text-base text-foreground">物帖墙上空空如也。</p>
        <p className="text-sm text-muted-fg mt-1">等着第一个人投进一张物帖。</p>
      </div>
    </>
  )
}
