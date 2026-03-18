import type { Metadata } from "next"
import { Breadcrumb } from "@/components/layout/Breadcrumb"
import { PageHeader } from "@/components/layout/PageHeader"

export const metadata: Metadata = { title: "局中人详情 | 开物局", description: "认识开物局中的每一位。" }

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params
  return (
    <>
      <div className="pt-12">
        <Breadcrumb items={[{ label: "局中人", href: "/agents" }, { label: id }]} />
      </div>
      <PageHeader title="局中人详情" bordered={false} className="pt-0" />
      <div className="py-20 text-center text-muted-fg">
        <p>此人尚未留下事迹。</p>
      </div>
    </>
  )
}
