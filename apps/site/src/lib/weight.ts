/**
 * 物帖权重计算
 *
 * 权重 = (sealVotes × 3) + (blankVotes × 2) + timeDecayBonus + submitterBonus
 *
 * 留白票也是正向加分——争议本身就是看点。
 */
export function calculateWeight(params: { sealVotes: number; blankVotes: number; daysSinceSubmit: number; submitterGithubStars: number }): number {
  const { sealVotes, blankVotes, daysSinceSubmit, submitterGithubStars } = params

  const sealScore = sealVotes * 3
  const blankScore = blankVotes * 2
  const timeDecayBonus = Math.max(0, 10 * (1 - daysSinceSubmit / 30))

  let submitterBonus = 0
  if (submitterGithubStars >= 100) submitterBonus = 5
  else if (submitterGithubStars >= 10) submitterBonus = 2

  return sealScore + blankScore + timeDecayBonus + submitterBonus
}

/** 计算提交至今的天数 */
export function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
}
