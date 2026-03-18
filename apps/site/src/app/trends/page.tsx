import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/PageHeader"
import { getCurrentUser, getGitHubAuthUrl } from "@/lib/auth"
import { getKeywords } from "./queries"
import { SubmitForm } from "./components/SubmitForm"
import { KeywordPool } from "./components/KeywordPool"

export const metadata: Metadata = { title: "物帖墙 | 开物局", description: "说一个词，看它的命运。" }

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }): Promise<React.ReactElement> {
  const { status } = await searchParams
  const session = await getCurrentUser()
  const loginUrl = getGitHubAuthUrl("/trends")
  const isLoggedIn = session !== null

  const keywords = await getKeywords({ status: status || undefined, currentUserId: session?.userId })

  return (
    <>
      <PageHeader title="物 帖 墙" subtitle="说一个词，看它的命运。" />

      <div className="py-8 flex flex-col gap-8">
        <SubmitForm isLoggedIn={isLoggedIn} loginUrl={loginUrl} />
        <KeywordPool keywords={keywords} currentStatus={status ?? ""} isLoggedIn={isLoggedIn} loginUrl={loginUrl} />
      </div>
    </>
  )
}
