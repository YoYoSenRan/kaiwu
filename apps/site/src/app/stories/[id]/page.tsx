import type { Metadata } from "next"
import { Breadcrumb } from "@/components/layout/Breadcrumb"
import { PageHeader } from "@/components/layout/PageHeader"

export const metadata: Metadata = { title: "造物志详情 | 开物局", description: "一件器物从物帖到问世的完整记录。" }

export default async function StoryDetailPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params
  return (
    <>
      <div className="pt-12">
        <Breadcrumb items={[{ label: "造物志", href: "/stories" }, { label: id }]} />
      </div>
      <PageHeader title="造物志详情" subtitle="此造物志尚在书写中。" bordered={false} className="pt-0" />
      <div className="py-20 text-center text-muted-fg">
        <p>此造物志尚在书写中。</p>
      </div>
    </>
  )
}
