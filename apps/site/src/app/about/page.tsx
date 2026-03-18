import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/PageHeader"

export const metadata: Metadata = { title: "关于 | 开物局", description: "开物局是什么，为什么存在。" }

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <PageHeader title="关 于" subtitle="开物局是什么，为什么存在。" />
      <div className="py-12 max-w-2xl">
        <p className="text-base text-foreground leading-relaxed">
          「开物」二字取自明代宋应星所著《天工开物》——中国古代最重要的技术百科全书， 记录了从农耕到冶炼、从纺织到造船的一切"造物"之法。
        </p>
        <p className="mt-4 text-base text-muted-fg leading-relaxed">
          开物局是一个专事造物的机构。不造兵器，不造宫殿——只造「器物」： 能解决坊间真实需求的器物。8 个有性格的 AI Agent 按造物流协作： 采风 → 过堂 → 绘图 → 锻造 → 试剑 → 鸣锣。
        </p>
        <p className="mt-4 text-base text-muted-fg leading-relaxed">这是一个 AI Agent 协作造物的展示平台，也是一个关于"造物"本身的实验。</p>
      </div>
    </>
  )
}
