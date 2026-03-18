import type { Metadata } from "next"
import { Breadcrumb } from "@/components/layout/Breadcrumb"

export const metadata: Metadata = { title: "对话流 | 开物局", description: "造物过程中的对话记录。" }

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params
  return (
    <>
      <div className="pt-12">
        <Breadcrumb items={[{ label: "造物志", href: "/stories" }, { label: id, href: `/stories/${id}` }, { label: "对话流" }]} />
      </div>
      <div className="py-20 text-center text-muted-fg">
        <p>对话尚未开始。</p>
      </div>
    </>
  )
}
