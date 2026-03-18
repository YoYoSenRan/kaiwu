import { PaperCard } from "@/components/ui/PaperCard"
import { VoteButton } from "./VoteButton"
import type { KeywordWithMeta } from "../queries"

export function KeywordCard({ keyword, isLoggedIn, loginUrl }: { keyword: KeywordWithMeta; isLoggedIn: boolean; loginUrl: string }): React.ReactElement {
  return (
    <PaperCard>
      <div className="flex flex-col gap-3">
        {/* 标题 */}
        <h3 className="font-display text-lg font-700 text-foreground">{keyword.text}</h3>

        {/* 理由 */}
        <p className="text-sm text-muted-fg leading-relaxed">{keyword.reason}</p>

        {/* 底部：投票 + 提交者 */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <VoteButton
            keywordId={keyword.id}
            sealVotes={keyword.sealVotes}
            blankVotes={keyword.blankVotes}
            currentStance={keyword.currentUserStance}
            isLoggedIn={isLoggedIn}
            loginUrl={loginUrl}
          />

          {keyword.submitter && (
            <div className="flex items-center gap-2 text-xs text-muted-fg">
              {keyword.submitter.avatarUrl && <img src={keyword.submitter.avatarUrl} alt={keyword.submitter.username} className="w-5 h-5 rounded-full" />}
              <span>@{keyword.submitter.username}</span>
            </div>
          )}
        </div>
      </div>
    </PaperCard>
  )
}
