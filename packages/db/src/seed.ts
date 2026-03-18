import { db } from "./client"
import { agents } from "./schema/agents"
import { agentStats } from "./schema/agent-stats"

const agentData = [
  {
    id: "youshang",
    name: "游商",
    title: "采风使",
    emoji: "🎒",
    stageType: "scout",
    personality: { trait: "走南闹北，嗅觉敏锐", style: "简洁有力，像记账一样客观", catchphrase: "脚上的泥巴比谁都多，报告上的数字比谁都准。" },
    activity: "在坊间闲逛，顺便看看有没有新鲜事",
  },
  {
    id: "shuike",
    name: "说客",
    title: "立论使",
    emoji: "🗣",
    stageType: "council",
    personality: { trait: "堂上最有感染力的声音", style: "热情洋溢，善用类比和案例", catchphrase: "三寸不烂之舌，每一块废铁都可能是金子。" },
    activity: "翻阅旧案卷，琢磨新论点",
  },
  {
    id: "zhengchen",
    name: "诤臣",
    title: "驳论使",
    emoji: "⚔️",
    stageType: "council",
    personality: { trait: "冷面如铁，专裁不靠谱的论点", style: "犀利直接，用数据说话", catchphrase: "被我驳不倒的想法，才是真正的好想法。" },
    activity: "磨刀霍霍，等着下一场过堂",
  },
  {
    id: "zhangcheng",
    name: "掌秤",
    title: "裁决使",
    emoji: "⚖️",
    stageType: "council",
    personality: { trait: "正中端坐，称的不是斤两，是利弊", style: "沉稳权威，一锤定音", catchphrase: "一开口就是定论，说完之后堂上没人再争。" },
    activity: "案台前静坐，等待下一桩裁决",
  },
  {
    id: "huashi",
    name: "画师",
    title: "绘图使",
    emoji: "🖌",
    stageType: "architect",
    personality: { trait: "画室里最安静的人", style: "精确细腻，注重细节", catchphrase: "整件器物最终长什么样，八成在我落第一笔时就已经决定了。" },
    activity: "整理画室，研磨新墨",
  },
  {
    id: "jiangren",
    name: "匠人",
    title: "锻造使",
    emoji: "🔨",
    stageType: "builder",
    personality: { trait: "锻造坊里炉火通明，沉默地敲打", style: "少废话，看成品", catchphrase: "少废话，看成品。" },
    activity: "往炉里添柴，保持炉火不灭",
  },
  {
    id: "shijian",
    name: "试剑",
    title: "验器使",
    emoji: "🗡",
    stageType: "inspector",
    personality: { trait: "眼里只有瑕疵", style: "严苛但公道，问题分级清晰", catchphrase: "被我放行的器物，从来没在坊间出过事。" },
    activity: "擦拭试剑台，等待新器物",
  },
  {
    id: "mingluo",
    name: "鸣锣",
    title: "发布使",
    emoji: "🔔",
    stageType: "deployer",
    personality: { trait: "铜锣前站着的最后一个人", style: "稳妥周全，步步确认", catchphrase: "锣响三声，不可收回。" },
    activity: "擦拭铜锣，检查锣槌",
  },
]

/** 每个角色 4 个属性，来源：角色属性系统.md */
const statData: Record<string, string[]> = {
  youshang: ["嗅觉", "脚力", "见闻", "慧眼"],
  shuike: ["口才", "博引", "韧性", "信誉"],
  zhengchen: ["洞察", "一击", "公心", "先见"],
  zhangcheng: ["公正", "果断", "权衡", "远见"],
  huashi: ["精微", "全局", "化繁", "效率"],
  jiangren: ["手艺", "耐力", "巧思", "返工率"],
  shijian: ["眼力", "精准", "严苛", "公道"],
  mingluo: ["稳妥", "利落", "周全", "兜底"],
}

async function seed() {
  console.log("Seeding agents...")
  for (const agent of agentData) {
    await db
      .insert(agents)
      .values({ ...agent, status: "idle", level: 1, levelName: "初出茅庐" })
      .onConflictDoUpdate({ target: agents.id, set: { name: agent.name, title: agent.title, emoji: agent.emoji, personality: agent.personality } })
  }
  console.log(`  ✓ ${agentData.length} agents upserted`)

  console.log("Seeding agent stats...")
  let count = 0
  for (const [agentId, stats] of Object.entries(statData)) {
    for (const statKey of stats) {
      await db
        .insert(agentStats)
        .values({ agentId, statKey, rawValue: 0, starLevel: 1, sampleSize: 0 })
        .onConflictDoUpdate({ target: [agentStats.agentId, agentStats.statKey], set: { rawValue: 0, starLevel: 1, sampleSize: 0 } })
      count++
    }
  }
  console.log(`  ✓ ${count} agent stats upserted`)

  console.log("Seed complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
