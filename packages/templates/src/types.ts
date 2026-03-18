/** 造物流六阶段 */
export const STAGE_TYPES = ["scout", "council", "architect", "builder", "inspector", "deployer"] as const

export type StageType = (typeof STAGE_TYPES)[number]
